import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ActionButton, AppScreen, AppText, BiText, Card, DemoNotice, Field, ScreenHeader } from '../../components/ui';
import { useLanguage } from '../../context/LanguageContext';
import colors from '../../constants/colors';
import { useDoctors } from '../../hooks/usePolling';
import { findHospital, mockSlots, type DemoDoctor } from '../../services/mock';
import { formatTaka, toIsoDate } from '../../utils/format';
import { AREAS, distanceKm, type Coords } from '../../utils/geo';

const LOCATION_TIMEOUT_MS = 10000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (reason) => { clearTimeout(timer); reject(reason); },
    );
  });
}

/** Has a chamber session today and at least one free slot that has not passed yet. */
function isAvailableToday(doctor: DemoDoctor, now: Date): boolean {
  if (!doctor.chambers.some((chamber) => chamber.weekdays.includes(now.getDay()))) return false;
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  return mockSlots(doctor, toIsoDate(now)).some((slot) => {
    const [h, m] = slot.time.split(':').map(Number);
    return slot.available && h * 60 + m > minutesNow;
  });
}

export default function DoctorsScreen() {
  const { language, t, tf, nf, L } = useLanguage();
  const doctors = useDoctors();
  const [search, setSearch] = useState('');
  const [todayOnly, setTodayOnly] = useState(false);
  const [nearby, setNearby] = useState(false);
  const [locating, setLocating] = useState(false);
  const [origin, setOrigin] = useState<{ coords: Coords; areaId?: string } | null>(null);
  const [needArea, setNeedArea] = useState(false);
  const attempt = useRef(0);

  async function toggleNearby() {
    attempt.current += 1;
    if (nearby) {
      setNearby(false);
      setOrigin(null);
      setNeedArea(false);
      setLocating(false);
      return;
    }
    const mine = attempt.current;
    setNearby(true);
    setLocating(true);
    setNeedArea(false);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') throw new Error('denied');
      const position = await withTimeout(
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        LOCATION_TIMEOUT_MS,
      );
      if (attempt.current !== mine) return;
      setOrigin({ coords: { lat: position.coords.latitude, lng: position.coords.longitude } });
    } catch {
      // Denied, unavailable or timed out: let the user pick an area instead.
      if (attempt.current === mine) setNeedArea(true);
    } finally {
      if (attempt.current === mine) setLocating(false);
    }
  }

  function clearFilters() {
    attempt.current += 1;
    setSearch('');
    setTodayOnly(false);
    setNearby(false);
    setOrigin(null);
    setNeedArea(false);
    setLocating(false);
  }

  const query = search.trim().toLowerCase();
  const now = new Date();
  const sorting = nearby && origin !== null;
  const km = (doctor: DemoDoctor) => {
    const hospital = findHospital(doctor.hospitalId);
    return origin ? distanceKm(origin.coords, { lat: hospital.lat, lng: hospital.lng }) : 0;
  };
  const visibleDoctors = doctors
    .filter((doctor) => {
      const hospital = findHospital(doctor.hospitalId);
      const matches = [doctor.name, doctor.specialty, doctor.degrees, hospital.name, hospital.area]
        .flatMap((text) => [text.en, text.bn])
        .join(' ')
        .toLowerCase()
        .includes(query);
      return matches && (!todayOnly || isAvailableToday(doctor, now));
    })
    .sort((a, b) => (sorting ? km(a) - km(b) : 0));

  const filtersOn = todayOnly || sorting;
  const anyFilter = filtersOn || nearby || query.length > 0;
  const countLine = filtersOn
    ? [
      tf('doctorsCountBase', { n: visibleDoctors.length }),
      todayOnly ? t('tagAvailableToday') : '',
      sorting ? t('tagNearest') : '',
    ].filter(Boolean).join(' · ')
    : tf('doctorsCount', { n: visibleDoctors.length });
  const areaName = origin?.areaId ? AREAS.find((area) => area.id === origin.areaId)?.name[language] : undefined;

  return (
    <AppScreen
      header={
        <ScreenHeader title={L('doctors')}>
          <BiText text={L('doctorsSubtitle')} style={styles.headerSubtitle} />
        </ScreenHeader>
      }
    >
      <DemoNotice compact />
      <Field value={search} onChangeText={setSearch} placeholder={t('searchDoctors')} />
      <View style={styles.filterRow}>
        <FilterPill label={t('availableToday')} active={todayOnly} onPress={() => setTodayOnly((value) => !value)} />
        <FilterPill
          label={locating ? t('nearbyLocating') : t('doctorFilters')}
          active={nearby}
          icon="location"
          onPress={() => { void toggleNearby(); }}
        />
      </View>
      {nearby && (needArea || origin?.areaId) ? (
        <View style={styles.areaBox}>
          <AppText style={styles.areaHint}>
            {origin?.areaId ? tf('nearbyFromArea', { area: areaName ?? '' }) : t('nearbyPickArea')}
          </AppText>
          <View style={styles.filterRow}>
            {AREAS.map((area) => (
              <FilterPill
                key={area.id}
                label={area.name[language]}
                active={origin?.areaId === area.id}
                onPress={() => setOrigin({ coords: area.coords, areaId: area.id })}
              />
            ))}
          </View>
        </View>
      ) : null}
      <AppText style={styles.results}>{countLine}</AppText>
      {visibleDoctors.map((doctor) => (
        <Card key={doctor.id} style={styles.doctorCard}>
          <View style={styles.doctorTop}>
            <View style={styles.avatar}><AppText style={styles.avatarText}>{doctor.initials[language]}</AppText></View>
            <View style={styles.flex}>
              <AppText style={styles.doctorName}>{doctor.name[language]}</AppText>
              <AppText style={styles.specialty}>{doctor.specialty[language]}</AppText>
            </View>
            <View style={styles.rating}>
              <Ionicons name="star" size={12} color={colors.yellowText} />
              <AppText style={styles.ratingText}>{nf(doctor.rating.toFixed(1))}</AppText>
            </View>
          </View>
          <AppText style={styles.degrees}>{doctor.degrees[language]}</AppText>
          <View style={styles.details}>
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={15} color={colors.muted} />
              <AppText style={styles.detailText}>{findHospital(doctor.hospitalId).name[language]}</AppText>
            </View>
            {origin ? (
              <View style={styles.detailRow}>
                <Ionicons name="navigate-outline" size={15} color={colors.brand} />
                <AppText style={[styles.detailText, styles.distance]}>{tf('distanceKm', { km: km(doctor).toFixed(1) })}</AppText>
              </View>
            ) : null}
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={15} color={colors.muted} />
              <AppText style={styles.detailText}>{doctor.nextSlot[language]} · {tf('slotsCount', { n: doctor.slots })}</AppText>
            </View>
          </View>
          <View style={styles.footer}>
            <AppText style={styles.fee}>
              {nf(formatTaka(doctor.fee))} <AppText style={styles.feeCaption}>{t('consultationCaption')}</AppText>
            </AppText>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/booking', params: { doctorId: doctor.id } })}
              style={styles.bookButton}
            >
              <AppText style={styles.bookText}>{t('book')}</AppText>
            </Pressable>
          </View>
        </Card>
      ))}
      {visibleDoctors.length === 0 && (
        <View style={styles.emptyBox}>
          <AppText style={styles.empty}>{todayOnly && !query ? t('noDoctorsToday') : t('noDoctorMatches')}</AppText>
          {anyFilter ? <ActionButton label={t('clearFilters')} onPress={clearFilters} variant="secondary" /> : null}
        </View>
      )}
    </AppScreen>
  );
}

function FilterPill({ label, active = false, icon, onPress }: {
  label: string;
  active?: boolean;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.filterPill, active && styles.filterPillActive]}
    >
      {icon ? <Ionicons name={icon} size={13} color={active ? colors.brand : colors.muted} /> : null}
      <AppText style={[styles.filterText, active && styles.filterTextActive]}>{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerSubtitle: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  filterRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  areaBox: { gap: 8 },
  areaHint: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  distance: { color: colors.brand, fontWeight: '600' },
  filterPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
  filterPillActive: { backgroundColor: colors.brandSoft, borderColor: colors.brandSoft },
  filterText: { color: colors.muted, fontSize: 12, fontWeight: '500' },
  filterTextActive: { color: colors.brand },
  results: { color: colors.muted, fontSize: 13, marginTop: -6 },
  doctorCard: { gap: 12 },
  doctorTop: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  avatar: { width: 46, height: 46, borderRadius: 16, backgroundColor: colors.mint2, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.brand, fontSize: 16, fontWeight: '700' },
  doctorName: { color: colors.text, fontSize: 15, lineHeight: 23, fontWeight: '700' },
  specialty: { color: colors.brand, fontSize: 13, lineHeight: 20 },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.yellow, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  ratingText: { color: colors.yellowText, fontSize: 12, fontWeight: '700' },
  degrees: { color: colors.muted, fontSize: 12, lineHeight: 19 },
  details: { gap: 6, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 11 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { color: colors.text, fontSize: 12, lineHeight: 19, flexShrink: 1 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fee: { color: colors.text, fontSize: 16, fontWeight: '700' },
  feeCaption: { color: colors.muted, fontSize: 11, fontWeight: '400' },
  bookButton: { backgroundColor: colors.brand, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
  bookText: { color: colors.surface, fontSize: 13, fontWeight: '700' },
  emptyBox: { gap: 8 },
  empty: { color: colors.muted, textAlign: 'center', padding: 22 },
});
