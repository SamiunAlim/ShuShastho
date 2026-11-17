import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppScreen, AppText, BrandHeader, Card, DemoNotice, Field, PageTitle } from '../../components/ui';
import { useLanguage } from '../../context/LanguageContext';
import colors from '../../constants/colors';

const doctors = [
  { id: 'doctor-samira', name: 'Dr. Samira Hossain', specialty: 'Medicine Specialist', degrees: 'MBBS, FCPS (Medicine)', rating: '4.9', fee: '৳ 800', time: '10:30 AM · 2 slots' },
  { id: 'doctor-farhan', name: 'Dr. Farhan Ahmed', specialty: 'Cardiology', degrees: 'MBBS, MD (Cardiology)', rating: '4.8', fee: '৳ 1,000', time: '12:00 PM · 4 slots' },
];

export default function DoctorsScreen() {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const visibleDoctors = doctors.filter((doctor) =>
    `${doctor.name} ${doctor.specialty} ${doctor.degrees}`.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <AppScreen>
      <BrandHeader />
      <DemoNotice compact />
      <PageTitle title={t('doctors')} subtitle="Find verified care near you" />
      <Field value={search} onChangeText={setSearch} placeholder={t('searchDoctors')} />
      <View style={styles.filterRow}>
        <FilterPill label={t('availableToday')} active />
        <FilterPill label={t('doctorFilters')} />
        <FilterPill label={t('femaleDoctors')} />
      </View>
      <AppText style={styles.results}>{visibleDoctors.length} doctors · Dhaka</AppText>
      {visibleDoctors.map((doctor) => (
        <Card key={doctor.id} style={styles.doctorCard}>
          <View style={styles.doctorTop}>
            <View style={styles.avatar}><AppText style={styles.avatarText}>{doctor.name.split(' ')[1]?.[0]}{doctor.name.split(' ')[2]?.[0]}</AppText></View>
            <View style={{ flex: 1 }}>
              <AppText style={styles.doctorName}>{doctor.name}</AppText>
              <AppText style={styles.specialty}>{doctor.specialty}</AppText>
            </View>
            <View style={styles.rating}><AppText style={styles.ratingText}>★ {doctor.rating}</AppText></View>
          </View>
          <AppText style={styles.degrees}>{doctor.degrees}</AppText>
          <View style={styles.details}>
            <AppText style={styles.detailText}>⌖  Dhaka Medical Centre, Dhanmondi</AppText>
            <AppText style={styles.detailText}>◷  {doctor.time}</AppText>
          </View>
          <View style={styles.footer}>
            <AppText style={styles.fee}>{doctor.fee} <AppText style={styles.feeCaption}>consultation</AppText></AppText>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/booking', params: { doctorId: doctor.id, doctorName: doctor.name } })}
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
  filterRow: { flexDirection: 'row', gap: 8 },
  filterPill: { paddingHorizontal: 12, paddingVertical: 9, backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.border },
  filterPillActive: { backgroundColor: colors.brandSoft, borderColor: colors.brandSoft },
  filterText: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  filterTextActive: { color: colors.brand },
  results: { color: colors.muted, fontSize: 12, marginTop: -8 },
  doctorCard: { gap: 13 },
  doctorTop: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  avatar: { width: 46, height: 46, borderRadius: 16, backgroundColor: '#E7F2ED', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.brand, fontSize: 15, fontWeight: '700' },
  doctorName: { color: colors.text, fontSize: 14, fontWeight: '700', marginBottom: 4 },
  specialty: { color: colors.brand, fontSize: 12 },
  rating: { backgroundColor: '#FFF6E5', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  ratingText: { color: '#A77925', fontSize: 11, fontWeight: '700' },
  degrees: { color: colors.muted, fontSize: 12 },
  details: { gap: 7, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 11 },
  detailText: { color: colors.text, fontSize: 11 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fee: { color: colors.text, fontSize: 15, fontWeight: '700' },
  feeCaption: { color: colors.muted, fontSize: 10, fontWeight: '400' },
  bookButton: { backgroundColor: colors.brand, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 10 },
  bookText: { color: colors.surface, fontSize: 11, fontWeight: '700' },
  empty: { color: colors.muted, textAlign: 'center', padding: 22 },
});
