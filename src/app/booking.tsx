import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ActionButton, AppScreen, AppText, BrandHeader, Card, DemoNotice, PageTitle } from '../components/ui';
import { useLanguage } from '../context/LanguageContext';
import colors from '../constants/colors';
import { createAppointment } from '../services/api';

export default function BookingScreen() {
  const { doctorId, doctorName } = useLocalSearchParams<{ doctorId: string; doctorName: string }>();
  const { t } = useLanguage();
  const [selectedDate, setSelectedDate] = useState('2026-11-17');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState('');

  async function confirmBooking() {
    if (!doctorId || submitting) return;
    setError('');
    setSubmitting(true);
    try {
      const result = await createAppointment({
        doctorId,
        chamberId: 'dhaka-medical-centre-dhanmondi',
        date: selectedDate,
        paymentMethod: 'cash_at_chamber',
        idempotencyKey: `booking-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      });
      setConfirmation(`Serial ${result.serialNumber} · ${result.estimatedTime}`);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : t('backendRequired');
      setError(message.includes('not configured') ? t('backendRequired') : message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppScreen>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={() => router.back()}><AppText style={styles.back}>‹</AppText></Pressable>
        <BrandHeader />
      </View>
      <DemoNotice compact />
      <PageTitle title={t('bookingTitle')} subtitle={t('bookingDisclaimer')} />
      <Card style={styles.doctorCard}>
        <AppText style={styles.label}>{t('selectedDoctor')}</AppText>
        <AppText style={styles.doctor}>{doctorName ?? t('selectDoctor')}</AppText>
        <AppText style={styles.meta}>Medicine Specialist · Dhaka Medical Centre</AppText>
        <View style={styles.feeRow}><AppText style={styles.meta}>{t('consultationFee')}</AppText><AppText style={styles.fee}>৳ 800</AppText></View>
      </Card>
      <View style={styles.section}>
        <AppText style={styles.sectionTitle}>{t('chooseDay')}</AppText>
        <View style={styles.dates}>
          {[
            { value: '2026-11-17', label: `${t('today')} · 17 Nov` },
            { value: '2026-11-18', label: `${t('tomorrow')} · 18 Nov` },
            { value: '2026-11-19', label: `${t('thursday')} · 19 Nov` },
          ].map(({ value, label }) => (
            <Pressable key={value} onPress={() => setSelectedDate(value)} style={[styles.date, selectedDate === value && styles.selectedDate]}>
              <AppText style={[styles.dateText, selectedDate === value && styles.selectedDateText]}>{label}</AppText>
            </Pressable>
          ))}
        </View>
      </View>
      <Card style={styles.summary}>
        <AppText style={styles.sectionTitle}>{t('bookingTitle')}</AppText>
        <View style={styles.summaryRow}><AppText style={styles.meta}>{t('payment')}</AppText><AppText style={styles.summaryValue}>{t('cashAtChamber')}</AppText></View>
        <View style={styles.summaryRow}><AppText style={styles.meta}>{t('total')}</AppText><AppText style={styles.fee}>৳ 800</AppText></View>
      </Card>
      {confirmation ? <Card style={styles.successCard}><AppText style={styles.successText}>{confirmation}</AppText></Card> : null}
      {error ? <Card style={styles.errorCard}><AppText style={styles.errorText}>{error}</AppText></Card> : null}
      <ActionButton label={submitting ? '…' : t('confirmBooking')} onPress={confirmBooking} disabled={submitting || !doctorId || Boolean(confirmation)} />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  back: { color: colors.brand, fontSize: 32, paddingRight: 4 },
  doctorCard: { gap: 9 },
  label: { color: colors.muted, fontSize: 9, letterSpacing: 1, fontWeight: '700' },
  doctor: { color: colors.text, fontSize: 17, fontWeight: '700' },
  meta: { color: colors.muted, fontSize: 12 },
  feeRow: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, marginTop: 2, flexDirection: 'row', justifyContent: 'space-between' },
  fee: { color: colors.brand, fontSize: 16, fontWeight: '700' },
  section: { gap: 12 },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  dates: { gap: 8 },
  date: { borderColor: colors.border, borderWidth: 1, borderRadius: 13, backgroundColor: colors.surface, padding: 13 },
  selectedDate: { backgroundColor: colors.brandSoft, borderColor: colors.brand },
  dateText: { color: colors.text, fontSize: 12, fontWeight: '600' },
  selectedDateText: { color: colors.brand },
  summary: { gap: 13 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryValue: { color: colors.text, fontSize: 12, fontWeight: '600' },
  successCard: { backgroundColor: colors.brandSoft },
  successText: { color: colors.brand, fontWeight: '700' },
  errorCard: { backgroundColor: '#FFF7E7' },
  errorText: { color: '#765718', fontSize: 12, lineHeight: 18 },
});
