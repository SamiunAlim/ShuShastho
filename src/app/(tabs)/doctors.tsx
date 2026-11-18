import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppScreen, AppText, BiText, Card, DemoNotice, Field, ScreenHeader } from '../../components/ui';
import { useLanguage } from '../../context/LanguageContext';
import colors from '../../constants/colors';
import { DEMO, doctors } from '../../services/mock';
import { formatTaka } from '../../utils/format';

export default function DoctorsScreen() {
  const { language, t, tf, nf, L } = useLanguage();
  const [search, setSearch] = useState('');
  const query = search.trim().toLowerCase();
  const visibleDoctors = doctors.filter((doctor) =>
    [doctor.name, doctor.specialty, doctor.degrees, DEMO.hospital]
      .flatMap((text) => [text.en, text.bn])
      .join(' ')
      .toLowerCase()
      .includes(query),
  );

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
        <FilterPill label={t('availableToday')} active />
        <FilterPill label={t('doctorFilters')} />
        <FilterPill label={t('femaleDoctors')} />
      </View>
      <AppText style={styles.results}>{tf('doctorsCount', { n: visibleDoctors.length })}</AppText>
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
              <AppText style={styles.detailText}>{DEMO.hospital[language]}</AppText>
            </View>
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
      {visibleDoctors.length === 0 && <AppText style={styles.empty}>{t('noDoctorMatches')}</AppText>}
    </AppScreen>
  );
}

function FilterPill({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <View style={[styles.filterPill, active && styles.filterPillActive]}>
      <AppText style={[styles.filterText, active && styles.filterTextActive]}>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerSubtitle: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  filterRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  filterPill: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
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
  empty: { color: colors.muted, textAlign: 'center', padding: 22 },
});
