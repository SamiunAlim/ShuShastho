import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ActionButton, AppScreen, AppText, BiText, DemoNotice, KanthaCard, ScreenHeader } from '../components/ui';
import { useJourney } from '../context/JourneyContext';
import { useLanguage } from '../context/LanguageContext';
import colors from '../constants/colors';
import { DEMO, findDoctor, pharmacies, prescription } from '../services/mock';
import { addDays, formatTaka, MONTHS_SHORT, toBanglaDigits } from '../utils/format';

export default function PrescriptionScreen() {
  const { language, t, L, nf } = useLanguage();
  const journey = useJourney();
  const [selected, setSelected] = useState(journey.reservedPharmacyId ?? pharmacies[0].id);
  const doctor = findDoctor(DEMO.doctorId);
  const total = journey.rx.medicines.length;

  const followUp = useMemo(() => addDays(new Date(), prescription.followUpInDays), []);
  const now = new Date();
  const todayLabel = `${language === 'bn' ? toBanglaDigits(now.getDate()) : now.getDate()} ${MONTHS_SHORT[language][now.getMonth()]}`;
  const followUpDate = {
    en: `${followUp.getDate()} ${MONTHS_SHORT.en[followUp.getMonth()]}`,
    bn: `${toBanglaDigits(followUp.getDate())} ${MONTHS_SHORT.bn[followUp.getMonth()]}`,
  };

  function reserve() {
    journey.reservePharmacy(selected);
    // Reserve → Timeline (Records tab).
    router.navigate('/(tabs)/records');
  }

  return (
    <AppScreen
      header={
        <ScreenHeader
          title={L('rxTitle')}
          extra={`${doctor.name[language]} · ${todayLabel}`}
          onBack={() => router.back()}
        />
      }
      footer={<View style={styles.flex}><ActionButton label={t('reserveForPickup')} onPress={reserve} /></View>}
    >
      <DemoNotice compact />

      <KanthaCard style={styles.rxCard}>
        <View style={styles.rxTop}>
          <AppText style={styles.rxMark}>Rx</AppText>
          <View style={styles.newTag}><AppText style={styles.newTagText}>{L('rxNew')[language]}{language === 'bn' ? ' · New' : ''}</AppText></View>
        </View>
        <BiText text={prescription.diagnosis} style={styles.diagnosis} />

        {journey.rx.medicines.map((medicine) => (
          <View key={medicine.id} style={styles.medRow}>
            <MaterialCommunityIcons name="pill" size={20} color={colors.green2} />
            <View style={styles.flex}>
              <AppText style={styles.medName}>{medicine.name[language]}</AppText>
              <AppText style={styles.medSchedule}>
                {medicine.schedule[language]}
              </AppText>
            </View>
          </View>
        ))}

        <View style={styles.chips}>
          {journey.rx.tests.map((test) => (
            <View key={test} style={[styles.chip, { backgroundColor: colors.blue }]}>
              <MaterialCommunityIcons name="flask-outline" size={14} color={colors.blueText} />
              <AppText style={[styles.chipText, { color: colors.blueText }]}>{test}</AppText>
            </View>
          ))}
          <View style={[styles.chip, { backgroundColor: colors.yellow }]}>
            <Ionicons name="calendar-outline" size={14} color={colors.yellowText} />
            <AppText style={[styles.chipText, { color: colors.yellowText }]}>
              {L('rxFollowUp', { date: followUpDate })[language]}
            </AppText>
          </View>
        </View>
      </KanthaCard>

      <View style={styles.titleBlock}>
        <BiText text={L('rxWhereTitle')} style={styles.sectionTitle} />
        <AppText style={styles.sectionSub}>
          {L('rxWhereSubtitle', { n: total })[language]}
        </AppText>
      </View>

      {pharmacies.map((pharmacy) => {
        const active = pharmacy.id === selected;
        const full = pharmacy.inStock === total;
        return (
          <Pressable
            key={pharmacy.id}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            onPress={() => setSelected(pharmacy.id)}
            style={[styles.pharmacy, active && styles.pharmacyActive]}
          >
            <Ionicons
              name={active ? 'radio-button-on' : 'radio-button-off'}
              size={26}
              color={active ? colors.brand : colors.border}
            />
            <View style={styles.flex}>
              <AppText style={styles.pharmacyName}>{pharmacy.name[language]}</AppText>
              <AppText style={styles.pharmacyDetail}>{pharmacy.detail[language]}</AppText>
              <View style={[styles.stock, full ? styles.stockFull : styles.stockPartial]}>
                <AppText style={[styles.stockText, { color: full ? colors.success : colors.yellowText }]}>
                  {L(full ? 'stockFull' : 'stockPartial', { a: pharmacy.inStock, b: total })[language]}
                </AppText>
              </View>
            </View>
            <AppText style={styles.price}>{nf(formatTaka(pharmacy.price))}</AppText>
          </Pressable>
        );
      })}
      <AppText style={styles.note}>{t('pharmacyReserveNote')}</AppText>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  rxCard: { gap: 12 },
  rxTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rxMark: { color: colors.brand, fontSize: 22, fontWeight: '700' },
  newTag: { backgroundColor: colors.mint2, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  newTagText: { color: colors.brand, fontSize: 12, fontWeight: '600' },
  diagnosis: { color: colors.text, fontSize: 15, lineHeight: 23, fontWeight: '600' },
  medRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  medName: { color: colors.text, fontSize: 15, lineHeight: 22, fontWeight: '600' },
  medSchedule: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 11, paddingVertical: 6 },
  chipText: { fontSize: 12, fontWeight: '600' },
  titleBlock: { gap: 2 },
  sectionTitle: { color: colors.text, fontSize: 16, lineHeight: 24, fontWeight: '700' },
  sectionSub: { color: colors.muted, fontSize: 12 },
  pharmacy: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface,
    borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14,
  },
  pharmacyActive: { borderColor: colors.brand, borderWidth: 2, backgroundColor: colors.mint },
  pharmacyName: { color: colors.text, fontSize: 15, lineHeight: 22, fontWeight: '700' },
  pharmacyDetail: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  stock: { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, marginTop: 6 },
  stockFull: { backgroundColor: colors.mint2 },
  stockPartial: { backgroundColor: colors.yellow },
  stockText: { fontSize: 12, fontWeight: '600' },
  price: { color: colors.brand, fontSize: 20, fontWeight: '700' },
  note: { color: colors.muted, fontSize: 11, textAlign: 'center' },
});
