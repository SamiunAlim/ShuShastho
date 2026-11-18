import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ActionButton, AppScreen, AppText, BackButton, BrandHeader, Card, DemoNotice, PageTitle } from '../components/ui';
import { useLanguage } from '../context/LanguageContext';
import { useQueue } from '../context/QueueContext';
import colors from '../constants/colors';
import { createAppointment, isBackendConfigured } from '../services/api';
import { DEMO, findDoctor, mockCreateAppointment } from '../services/mock';
import { addDays, formatTaka, MONTHS_SHORT, toIsoDate, WEEKDAYS } from '../utils/format';

function newIdempotencyKey() {
  return `booking-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function BookingScreen() {
  const { doctorId: doctorIdParam } = useLocalSearchParams<{ doctorId?: string }>();
  const { language, t, nf } = useLanguage();
  const queue = useQueue();
  const doctor = findDoctor(doctorIdParam);

  // Today / tomorrow / day after, computed from the current date.
  const days = useMemo(() => {
    const today = new Date();
    return [0, 1, 2].map((offset) => {
      const date = addDays(today, offset);
      return { value: toIsoDate(date), offset, weekday: date.getDay(), day: date.getDate(), month: date.getMonth() };
    });
  }, []);

  const [selectedDate, setSelectedDate] = useState(days[0].value);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function dayLabel(day: (typeof days)[number]) {
    const name = day.offset === 0 ? t('today') : day.offset === 1 ? t('tomorrow') : WEEKDAYS[language][day.weekday];
    return `${name} · ${nf(day.day)} ${MONTHS_SHORT[language][day.month]}`;
  }

  async function confirmBooking() {
    if (submitting) return;
    setError('');
    setSubmitting(true);
    try {
      const input = {
        doctorId: doctor.id,
        chamberId: DEMO.chamberId,
        date: selectedDate,
        paymentMethod: 'cash_at_chamber' as const,
        idempotencyKey: newIdempotencyKey(),
      };
      // Demo mode (no EXPO_PUBLIC_API_URL) uses the mock; otherwise the real API.
      const result = isBackendConfigured() ? await createAppointment(input) : await mockCreateAppointment(input);
      const serial = Number.parseInt(result.serialNumber, 10);
      queue.bookSerial({ doctorId: doctor.id, serial: Number.isFinite(serial) ? serial : DEMO.serial });
      router.replace('/(tabs)/serials');
    } catch {
      setError(t('connectionError'));
      setSubmitting(false);
    }
  }

  return (
    <AppScreen>
      <View style={styles.header}>
        <BackButton onPress={() => router.back()} />
        <BrandHeader />
      </View>
      <DemoNotice compact />
      <PageTitle title={t('bookingTitle')} subtitle={t('bookingDisclaimer')} />
      <Card style={styles.doctorCard}>
        <AppText style={styles.label}>{t('selectedDoctor')}</AppText>
        <AppText style={styles.doctor}>{doctor.name[language]}</AppText>
        <AppText style={styles.meta}>{doctor.specialty[language]} · {DEMO.hospital[language]}</AppText>
        <View style={styles.feeRow}>
          <AppText style={styles.meta}>{t('consultationFee')}</AppText>
          <AppText style={styles.fee}>{nf(formatTaka(doctor.fee))}</AppText>
        </View>
      </Card>
      <View style={styles.section}>
        <AppText style={styles.sectionTitle}>{t('chooseDay')}</AppText>
        <View style={styles.dates}>
          {days.map((day) => {
            const selected = selectedDate === day.value;
            return (
              <Pressable
                key={day.value}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setSelectedDate(day.value)}
                style={[styles.date, selected && styles.selectedDate]}
              >
                <AppText style={[styles.dateText, selected && styles.selectedDateText]}>{dayLabel(day)}</AppText>
              </Pressable>
            );
          })}
        </View>
      </View>
      <Card style={styles.summary}>
        <AppText style={styles.sectionTitle}>{t('bookingTitle')}</AppText>
        <View style={styles.summaryRow}>
          <AppText style={styles.meta}>{t('payment')}</AppText>
          <AppText style={styles.summaryValue}>{t('cashAtChamber')}</AppText>
        </View>
        <View style={styles.summaryRow}>
          <AppText style={styles.meta}>{t('total')}</AppText>
          <AppText style={styles.fee}>{nf(formatTaka(doctor.fee))}</AppText>
        </View>
      </Card>
      {error ? <Card style={styles.errorCard}><AppText style={styles.errorText}>{error}</AppText></Card> : null}
      <ActionButton label={submitting ? '…' : t('confirmBooking')} onPress={confirmBooking} disabled={submitting} />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  doctorCard: { gap: 8 },
  label: { color: colors.muted, fontSize: 11, letterSpacing: 0.8, fontWeight: '600' },
  doctor: { color: colors.text, fontSize: 18, lineHeight: 27, fontWeight: '700' },
  meta: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  feeRow: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, marginTop: 2, flexDirection: 'row', justifyContent: 'space-between' },
  fee: { color: colors.brand, fontSize: 17, fontWeight: '700' },
  section: { gap: 12 },
  sectionTitle: { color: colors.text, fontSize: 16, lineHeight: 24, fontWeight: '700' },
  dates: { gap: 8 },
  date: { borderColor: colors.border, borderWidth: 1, borderRadius: 12, backgroundColor: colors.surface, padding: 14 },
  selectedDate: { backgroundColor: colors.brandSoft, borderColor: colors.brand },
  dateText: { color: colors.text, fontSize: 14, fontWeight: '500' },
  selectedDateText: { color: colors.brand, fontWeight: '700' },
  summary: { gap: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryValue: { color: colors.text, fontSize: 13, fontWeight: '600' },
  errorCard: { backgroundColor: colors.yellow, borderColor: colors.yellow },
  errorText: { color: colors.yellowText, fontSize: 13, lineHeight: 20 },
});
