import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { StaffFooter } from '../../components/StaffFooter';
import { ActionButton, AppScreen, AppText, BiText, Card, KanthaCard, ScreenHeader } from '../../components/ui';
import colors from '../../constants/colors';
import type { TranslationKey } from '../../constants/i18n';
import { useAuth } from '../../context/AuthContext';
import { PharmacyStatus, useJourney } from '../../context/JourneyContext';
import { useLanguage } from '../../context/LanguageContext';
import { DEMO, findPharmacy } from '../../services/mock';
import { formatTaka } from '../../utils/format';

const STATUS_STYLE: Record<Exclude<PharmacyStatus, 'none'>, { label: TranslationKey; bg: string; fg: string }> = {
  requested: { label: 'phStatusRequested', bg: colors.yellow, fg: colors.yellowText },
  accepted: { label: 'phStatusAccepted', bg: colors.blue, fg: colors.blueText },
  partial: { label: 'phStatusPartial', bg: colors.yellow, fg: colors.yellowText },
  rejected: { label: 'phStatusRejected', bg: colors.redSoft, fg: colors.danger },
  ready: { label: 'phStatusReady', bg: colors.mint2, fg: colors.brand },
};

/**
 * Pharmacist home: the patient's pickup reservation (made from the Prescription screen) with
 * accept / partial / reject, then "Mark ready". Prices come from pharmacy data, never from AI.
 */
export default function PharmacyRequestsScreen() {
  const { t, tf, L, nf, language } = useLanguage();
  const { session } = useAuth();
  const journey = useJourney();
  const pharmacy = findPharmacy(journey.reservedPharmacyId);
  const status = journey.pharmacyStatus;

  const [partialMode, setPartialMode] = useState(false);
  const [available, setAvailable] = useState<string[]>([]);

  const medicines = journey.rx.medicines;
  const startPartial = () => {
    setAvailable(medicines.map((m) => m.id));
    setPartialMode(true);
  };
  const confirmPartial = () => {
    const unavailable = medicines.map((m) => m.id).filter((id) => !available.includes(id));
    // Nothing missing means this is really a full accept.
    journey.respondPharmacy(unavailable.length === 0 ? 'accepted' : 'partial', unavailable);
    setPartialMode(false);
  };
  const toggle = (id: string) => setAvailable((list) => (list.includes(id) ? list.filter((v) => v !== id) : [...list, id]));

  const missingNames = medicines.filter((m) => journey.unavailableMedicineIds.includes(m.id)).map((m) => m.name[language]);
  const badge = status !== 'none' ? STATUS_STYLE[status] : null;

  return (
    <AppScreen
      header={<ScreenHeader title={L('destPharmacist')} extra={[pharmacy?.name[language], session?.name[language]].filter(Boolean).join(' · ')} />}
      contentStyle={styles.content}
      footer={<StaffFooter />}
    >
      <BiText text={L('pharmacyReservations')} style={styles.heading} />

      {pharmacy && badge ? (
        <KanthaCard style={styles.card}>
          <View style={styles.top}>
            <View style={styles.flex}>
              <AppText style={styles.title}>{tf('pharmacyReadyFor', { name: DEMO.patient[language] })}</AppText>
              <AppText style={styles.meta}>{pharmacy.name[language]}</AppText>
            </View>
            <View style={[styles.chip, { backgroundColor: badge.bg }]}>
              <AppText style={[styles.chipText, { color: badge.fg }]}>{t(badge.label)}</AppText>
            </View>
          </View>

          {partialMode ? <AppText style={styles.hint}>{t('phPartialHint')}</AppText> : null}

          <View style={styles.meds}>
            {medicines.map((medicine) => {
              const missing = journey.unavailableMedicineIds.includes(medicine.id);
              return partialMode ? (
                <Pressable
                  key={medicine.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: available.includes(medicine.id) }}
                  onPress={() => toggle(medicine.id)}
                  style={styles.medRow}
                >
                  <Ionicons name={available.includes(medicine.id) ? 'checkbox' : 'square-outline'} size={22} color={available.includes(medicine.id) ? colors.brand : colors.muted} />
                  <AppText style={styles.medName}>{medicine.name[language]}</AppText>
                </Pressable>
              ) : (
                <View key={medicine.id} style={styles.medRow}>
                  <MaterialCommunityIcons name="pill" size={18} color={missing ? colors.danger : colors.green2} />
                  <AppText style={[styles.medName, missing && styles.missing]}>{medicine.name[language]}</AppText>
                </View>
              );
            })}
          </View>

          {status === 'partial' && missingNames.length > 0 ? (
            <AppText style={styles.missingNote}>{t('phMissing').replace('{names}', missingNames.join(', '))}</AppText>
          ) : null}

          <View style={styles.totalRow}>
            <AppText style={styles.meta}>{t('phTotal')}</AppText>
            <AppText style={styles.price}>{nf(formatTaka(pharmacy.price))}</AppText>
          </View>

          {status === 'requested' && !partialMode ? (
            <View style={styles.actions}>
              <View style={styles.flex}><ActionButton label={t('phAcceptAll')} onPress={() => journey.respondPharmacy('accepted')} /></View>
              <View style={styles.flex}><ActionButton label={t('phPartial')} onPress={startPartial} variant="secondary" /></View>
              <View style={styles.flex}><ActionButton label={t('phReject')} onPress={() => journey.respondPharmacy('rejected')} variant="danger" /></View>
            </View>
          ) : null}
          {partialMode ? (
            <ActionButton label={t('phConfirmPartial')} onPress={confirmPartial} />
          ) : null}
          {status === 'accepted' || status === 'partial' ? (
            <ActionButton label={t('phMarkReady')} onPress={journey.markPharmacyReady} />
          ) : null}
        </KanthaCard>
      ) : (
        <Card style={styles.empty}>
          <Ionicons name="medkit-outline" size={26} color={colors.muted} />
          <AppText style={styles.meta}>{t('pharmacyNoReservations')}</AppText>
        </Card>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingTop: 16, gap: 14 },
  heading: { color: colors.text, fontSize: 16, lineHeight: 24, fontWeight: '700' },
  card: { gap: 12 },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  title: { color: colors.text, fontSize: 15, lineHeight: 22, fontWeight: '700' },
  meta: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  hint: { color: colors.yellowText, fontSize: 12, lineHeight: 18, backgroundColor: colors.yellow, borderRadius: 10, padding: 8 },
  chip: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  chipText: { fontSize: 11, fontWeight: '600' },
  meds: { gap: 8 },
  medRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 32 },
  medName: { flex: 1, color: colors.text, fontSize: 14, lineHeight: 20 },
  missing: { color: colors.danger, textDecorationLine: 'line-through' },
  missingNote: { color: colors.danger, fontSize: 12, lineHeight: 18 },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
  price: { color: colors.brand, fontSize: 18, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 8 },
  empty: { alignItems: 'center', gap: 6, paddingVertical: 22 },
});
