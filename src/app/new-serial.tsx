import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { PaymentSheet } from '../components/PaymentSheet';
import { ActionButton, AppScreen, AppText, BiText, Card, Field, FONT_FAMILIES, ScreenHeader } from '../components/ui';
import colors from '../constants/colors';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useQueue } from '../context/QueueContext';
import { useDoctors } from '../hooks/usePolling';
import { createAppointment, getSlots, type Appointment, type PaymentInfo, type PaymentMethod } from '../services/data';
import { DEMO, findDepartment, findHospital, mockSerial, timeLabel, type DemoDoctor, type Slot } from '../services/mock';
import { addDays, formatTaka, MONTHS_SHORT, toAsciiDigits, toIsoDate, WEEKDAYS } from '../utils/format';
import { goBack } from '../utils/navigation';
import { METHOD_ICON, METHOD_NAME_KEY } from '../utils/payment';

const DAYS_AHEAD = 7;
const PAYMENT_METHODS: PaymentMethod[] = ['cash_at_chamber', 'bkash', 'nagad', 'card'];

type Step = 'doctor' | 'time' | 'success';

function newKey() {
  return `quick-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Quick "create a serial" flow: doctor → date + free serials → confirm sheet → success. */
export default function NewSerialScreen() {
  const { language, t, tf, nf, L } = useLanguage();
  const { profile } = useAuth();
  const queue = useQueue();
  const doctors = useDoctors();
  const idempotencyKey = useRef(newKey());

  const [step, setStep] = useState<Step>('doctor');
  const [search, setSearch] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [time, setTime] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState('');
  const [booked, setBooked] = useState<Appointment | null>(null);

  const [forSelf, setForSelf] = useState(true);
  const [otherName, setOtherName] = useState('');
  const [otherAge, setOtherAge] = useState('');
  const [otherRelation, setOtherRelation] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash_at_chamber');

  const days = useMemo(() => {
    const today = new Date();
    return Array.from({ length: DAYS_AHEAD }, (_, offset) => {
      const d = addDays(today, offset);
      return { value: toIsoDate(d), offset, weekday: d.getDay(), day: d.getDate(), month: d.getMonth() };
    });
  }, []);
  const selectedDate = date || days[0].value;

  const doctor: DemoDoctor | undefined = doctors.find((d) => d.id === doctorId);
  const hospital = doctor ? findHospital(doctor.hospitalId) : undefined;
  const slot = slots.find((s) => s.time === time);
  const serial = doctor && time ? mockSerial(doctor, selectedDate, time) : 0;

  const query = search.trim().toLowerCase();
  const visibleDoctors = doctors.filter((d) =>
    [d.name, d.specialty, d.degrees, findHospital(d.hospitalId).name, findHospital(d.hospitalId).area]
      .flatMap((text) => [text.en, text.bn])
      .join(' ')
      .toLowerCase()
      .includes(query),
  );

  useEffect(() => {
    if (!doctorId) return;
    let active = true;
    getSlots(doctorId, selectedDate).then((list) => {
      if (!active) return;
      setSlots(list);
      setTime((current) => (list.some((s) => s.time === current && s.available) ? current : ''));
    });
    return () => { active = false; };
  }, [doctorId, selectedDate]);

  function dayLabel(day: (typeof days)[number]) {
    const name = day.offset === 0 ? t('today') : day.offset === 1 ? t('tomorrow') : WEEKDAYS[language][day.weekday];
    return `${name} · ${nf(day.day)} ${MONTHS_SHORT[language][day.month]}`;
  }

  function fullDate(iso: string) {
    const [y, m, d] = iso.split('-').map(Number);
    return `${WEEKDAYS[language][new Date(y, m - 1, d).getDay()]}, ${nf(d)} ${MONTHS_SHORT[language][m - 1]}`;
  }

  function chooseDoctor(id: string) {
    if (id !== doctorId) {
      setDoctorId(id);
      setSlots([]);
      setTime('');
    }
    setStep('time');
  }

  function back() {
    if (step === 'time') setStep('doctor');
    else goBack('/(tabs)/serials');
  }

  const otherAgeNumber = Number(otherAge);
  const otherOk = otherName.trim().length > 0 && Number.isInteger(otherAgeNumber) && otherAgeNumber > 0 && otherAgeNumber < 120
    && otherRelation.trim().length > 0;
  const selfName = profile?.name || DEMO.patient[language];

  async function book(payment: PaymentInfo) {
    if (!doctor || booking) return;
    setError('');
    setBooking(true);
    try {
      const patient = forSelf
        ? {
          forSelf: true,
          name: profile?.name || DEMO.patient.en,
          age: profile?.age || '',
          gender: profile?.gender ?? '',
          relation: '',
          phone: profile?.phone ?? '',
        }
        : { forSelf: false, name: otherName.trim(), age: otherAge, gender: '' as const, relation: otherRelation.trim(), phone: '' };
      const appointment = await createAppointment({
        doctorId: doctor.id,
        date: selectedDate,
        time,
        patient,
        reason: '',
        payment,
        idempotencyKey: idempotencyKey.current,
      });
      queue.bookSerial({ doctorId: doctor.id, serial: appointment.serial });
      setBooked(appointment);
      setConfirmOpen(false);
      setPayOpen(false);
      setStep('success');
    } catch {
      setError(t('connectionError'));
      setConfirmOpen(true);
      setPayOpen(false);
    } finally {
      setBooking(false);
    }
  }

  function onBookPress() {
    setAttempted(true);
    if (!forSelf && !otherOk) return;
    if (payMethod === 'cash_at_chamber') {
      void book({ method: 'cash_at_chamber', status: 'pay_at_chamber', amount: doctor?.fee ?? 0 });
    } else {
      // Online methods: close this sheet and show the demo payment sheet; it books once paid.
      setConfirmOpen(false);
      setPayOpen(true);
    }
  }

  function resetFlow() {
    idempotencyKey.current = newKey();
    setBooked(null);
    setDoctorId('');
    setTime('');
    setSlots([]);
    setDate('');
    setError('');
    setAttempted(false);
    setPayMethod('cash_at_chamber');
    setStep('doctor');
  }

  return (
    <AppScreen
      header={<ScreenHeader title={L('nsTitle')} onBack={step === 'success' ? undefined : back} />}
      footer={
        step === 'time' ? (
          <View style={styles.footer}>
            <ActionButton label={time ? t('nsConfirmTitle') : t('nsPickSlot')} onPress={() => setConfirmOpen(true)} disabled={!time} />
          </View>
        ) : undefined
      }
    >
      {step === 'doctor' && (
        <>
          <BiText text={L('nsPickDoctor')} style={styles.sectionTitle} />
          <Field value={search} onChangeText={setSearch} placeholder={t('nsSearch')} />
          {visibleDoctors.map((item) => {
            const h = findHospital(item.hospitalId);
            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                onPress={() => chooseDoctor(item.id)}
                style={({ pressed }) => [pressed && styles.pressed]}
              >
                <Card style={styles.doctorCard}>
                  <View style={styles.row}>
                    <View style={styles.avatar}><AppText style={styles.avatarText}>{item.initials[language]}</AppText></View>
                    <View style={styles.flex}>
                      <AppText style={styles.doctorName}>{item.name[language]}</AppText>
                      <AppText style={styles.specialty}>{item.specialty[language]}</AppText>
                    </View>
                    <View style={styles.rating}>
                      <Ionicons name="star" size={12} color={colors.yellowText} />
                      <AppText style={styles.ratingText}>{nf(item.rating.toFixed(1))}</AppText>
                    </View>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="location-outline" size={15} color={colors.muted} />
                    <AppText style={styles.detailText}>{h.name[language]} · {h.area[language]}</AppText>
                  </View>
                  <View style={styles.row}>
                    <AppText style={styles.fee}>
                      {nf(formatTaka(item.fee))} <AppText style={styles.feeCaption}>{t('consultationCaption')}</AppText>
                    </AppText>
                    <View style={styles.flex} />
                    <Ionicons name="chevron-forward" size={18} color={colors.brand} />
                  </View>
                </Card>
              </Pressable>
            );
          })}
          {visibleDoctors.length === 0 ? <AppText style={styles.empty}>{t('noDoctorMatches')}</AppText> : null}
        </>
      )}

      {step === 'time' && doctor && hospital && (
        <>
          <Card style={styles.summaryCard}>
            <AppText style={styles.doctorName}>{doctor.name[language]}</AppText>
            <AppText style={styles.specialty}>{doctor.specialty[language]} · {findDepartment(doctor.departmentId)?.name[language]}</AppText>
            <AppText style={styles.meta}>{hospital.name[language]} · {hospital.area[language]}</AppText>
          </Card>

          <BiText text={L('chooseDay')} style={styles.sectionTitle} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {days.map((day) => {
              const selected = selectedDate === day.value;
              return (
                <Pressable
                  key={day.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setDate(day.value)}
                  style={[styles.chip, selected && styles.chipActive]}
                >
                  <AppText style={[styles.chipText, selected && styles.chipTextActive]}>{dayLabel(day)}</AppText>
                </Pressable>
              );
            })}
          </ScrollView>

          <BiText text={L('nsChamber')} style={styles.sectionTitle} />
          {doctor.chambers.map((chamber) => (
            <View key={chamber.chamberId} style={styles.session}>
              <Ionicons name="business-outline" size={18} color={colors.brand} />
              <AppText style={styles.sessionText}>
                {tf('nsSession', {
                  room: chamber.room[language],
                  days: chamber.days[language],
                  from: timeLabel(doctor.slotTimes[0])[language],
                  to: timeLabel(doctor.slotTimes[doctor.slotTimes.length - 1])[language],
                })}
              </AppText>
            </View>
          ))}

          <BiText text={L('nsFreeSerials')} style={styles.sectionTitle} />
          <View style={styles.chips}>
            {slots.map((s) => {
              const selected = time === s.time;
              return (
                <Pressable
                  key={s.time}
                  accessibilityRole="button"
                  accessibilityState={{ selected, disabled: !s.available }}
                  disabled={!s.available}
                  onPress={() => setTime(s.time)}
                  style={[styles.slot, selected && styles.chipActive, !s.available && styles.slotOff]}
                >
                  <AppText style={[styles.chipText, selected && styles.chipTextActive, !s.available && styles.slotOffText]}>
                    #{nf(mockSerial(doctor, selectedDate, s.time))} · {s.label[language]}
                  </AppText>
                  {!s.available ? <AppText style={styles.slotOffNote}>{t('bkSlotBooked')}</AppText> : null}
                </Pressable>
              );
            })}
          </View>
          {slots.length > 0 && slots.every((s) => !s.available) ? <AppText style={styles.empty}>{t('bkNoSlots')}</AppText> : null}
        </>
      )}

      {step === 'success' && booked && doctor && hospital && (
        <View style={styles.success}>
          <View style={styles.successIcon}><Ionicons name="checkmark" size={36} color={colors.surface} /></View>
          <AppText style={styles.successTitle}>{t('nsSuccess')}</AppText>
          <View style={styles.serialBadge}>
            <BiText text={L('yourSerial')} style={styles.serialLabel} subStyle={styles.centerSub} />
            <AppText style={styles.serialNumber}>#{nf(booked.serial)}</AppText>
          </View>
          <Card style={styles.successCard}>
            <AppText style={styles.doctorName}>{doctor.name[language]}</AppText>
            <AppText style={styles.meta}>{hospital.name[language]}</AppText>
            <AppText style={styles.when}>{fullDate(booked.date)} · {timeLabel(booked.time)[language]}</AppText>
            {booked.payment?.status === 'paid' ? (
              <AppText style={styles.meta}>
                {t('nsOnlinePaid').replace('{method}', t(METHOD_NAME_KEY[booked.payment.method]))} · {booked.payment.transactionId}
              </AppText>
            ) : (
              <AppText style={styles.meta}>{tf('payAtChamber', { amount: formatTaka(booked.fee) })}</AppText>
            )}
          </Card>
          <AppText style={styles.meta}>{t('nsSuccessHint')}</AppText>
          <View style={styles.fullWidth}>
            <ActionButton label={t('nsViewSerials')} onPress={() => router.replace('/(tabs)/serials')} />
            <View style={styles.gap} />
            <ActionButton label={t('nsBookAnother')} onPress={resetFlow} variant="secondary" />
          </View>
        </View>
      )}

      <Modal visible={confirmOpen && Boolean(doctor)} transparent animationType="slide" onRequestClose={() => setConfirmOpen(false)}>
        <View style={styles.backdrop}>
          <Pressable style={styles.scrim} onPress={() => setConfirmOpen(false)} accessibilityLabel={t('payClose')} />
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheetBody}>
              <BiText text={L('nsConfirmTitle')} style={styles.sectionTitle} />
              {doctor && hospital ? (
                <Card style={styles.review}>
                  <Row label={t('selectedDoctor')} value={doctor.name[language]} sub={doctor.specialty[language]} />
                  <Row label={t('nsHospital')} value={hospital.name[language]} sub={hospital.area[language]} />
                  <View style={styles.row}>
                    <View style={styles.flex}><Row label={t('nsDate')} value={fullDate(selectedDate)} /></View>
                    <View style={styles.flex}><Row label={t('nsTime')} value={slot?.label[language] ?? ''} /></View>
                  </View>
                  <View style={styles.row}>
                    <View style={styles.flex}><Row label={t('nsSerialNo')} value={`#${nf(serial)}`} /></View>
                    <View style={styles.flex}><Row label={t('consultationFee')} value={nf(formatTaka(doctor.fee))} /></View>
                  </View>
                </Card>
              ) : null}

              <View style={styles.toggle}>
                {([true, false] as const).map((value) => (
                  <Pressable
                    key={String(value)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: forSelf === value }}
                    onPress={() => { setForSelf(value); setAttempted(false); }}
                    style={[styles.toggleItem, forSelf === value && styles.toggleActive]}
                  >
                    <AppText style={[styles.toggleText, forSelf === value && styles.toggleTextActive]}>
                      {t(value ? 'bkForMe' : 'bkForSomeone')}
                    </AppText>
                  </Pressable>
                ))}
              </View>
              {forSelf ? (
                <AppText style={styles.meta}>{tf('nsPatientSelf', { name: selfName })}</AppText>
              ) : (
                <View style={styles.otherFields}>
                  <TextInput
                    accessibilityLabel={t('bkPatientName')}
                    value={otherName}
                    onChangeText={setOtherName}
                    placeholder={t('bkPatientName')}
                    placeholderTextColor={colors.muted}
                    style={[styles.input, attempted && !otherName.trim() && styles.inputError]}
                  />
                  <View style={styles.row}>
                    <TextInput
                      accessibilityLabel={t('pfAge')}
                      value={nf(otherAge)}
                      onChangeText={(text) => setOtherAge(toAsciiDigits(text).replace(/\D/g, '').slice(0, 3))}
                      keyboardType="number-pad"
                      placeholder={t('pfAge')}
                      placeholderTextColor={colors.muted}
                      style={[styles.input, styles.flex, attempted && !(otherAgeNumber > 0 && otherAgeNumber < 120) && styles.inputError]}
                    />
                    <TextInput
                      accessibilityLabel={t('bkRelation')}
                      value={otherRelation}
                      onChangeText={setOtherRelation}
                      placeholder={t('bkRelationHint')}
                      placeholderTextColor={colors.muted}
                      style={[styles.input, styles.flex2, attempted && !otherRelation.trim() && styles.inputError]}
                    />
                  </View>
                </View>
              )}

              <BiText text={L('payment')} style={styles.label} />
              <View style={styles.chips}>
                {PAYMENT_METHODS.map((method) => (
                  <Pressable
                    key={method}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: payMethod === method }}
                    onPress={() => setPayMethod(method)}
                    style={[styles.payChip, payMethod === method && styles.chipActive]}
                  >
                    <Ionicons name={METHOD_ICON[method]} size={16} color={payMethod === method ? colors.surface : colors.brand} />
                    <AppText style={[styles.chipText, payMethod === method && styles.chipTextActive]}>{t(METHOD_NAME_KEY[method])}</AppText>
                  </Pressable>
                ))}
              </View>

              {error ? <Card style={styles.errorCard}><AppText style={styles.errorText}>{error}</AppText></Card> : null}
              <ActionButton label={booking ? t('nsBooking') : t('nsBook')} onPress={onBookPress} disabled={booking} />
              <ActionButton label={t('payClose')} onPress={() => setConfirmOpen(false)} variant="secondary" />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {payOpen && doctor && payMethod !== 'cash_at_chamber' ? (
        <PaymentSheet
          visible
          method={payMethod}
          amount={doctor.fee}
          onClose={() => { setPayOpen(false); setConfirmOpen(true); }}
          onPaid={(result) => { void book(result); }}
        />
      ) : null}
    </AppScreen>
  );
}

function Row({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View style={styles.reviewRow}>
      <AppText style={styles.label}>{label}</AppText>
      <AppText style={styles.value}>{value}</AppText>
      {sub ? <AppText style={styles.meta}>{sub}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flex2: { flex: 2 },
  fullWidth: { alignSelf: 'stretch' },
  gap: { height: 10 },
  footer: { flex: 1 },
  pressed: { opacity: 0.85 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  sectionTitle: { color: colors.text, fontSize: 16, lineHeight: 24, fontWeight: '700' },
  label: { color: colors.muted, fontSize: 12, lineHeight: 18, fontWeight: '600' },
  value: { color: colors.text, fontSize: 14, lineHeight: 21, fontWeight: '700' },
  meta: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  empty: { color: colors.muted, textAlign: 'center', padding: 20 },
  doctorCard: { gap: 10 },
  avatar: { width: 46, height: 46, borderRadius: 16, backgroundColor: colors.mint2, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.brand, fontSize: 16, fontWeight: '700' },
  doctorName: { color: colors.text, fontSize: 15, lineHeight: 23, fontWeight: '700' },
  specialty: { color: colors.brand, fontSize: 13, lineHeight: 20 },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.yellow, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  ratingText: { color: colors.yellowText, fontSize: 12, fontWeight: '700' },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { color: colors.text, fontSize: 12, lineHeight: 19, flexShrink: 1 },
  fee: { color: colors.text, fontSize: 16, fontWeight: '700' },
  feeCaption: { color: colors.muted, fontSize: 11, fontWeight: '400' },
  summaryCard: { gap: 4 },
  chipRow: { gap: 8, paddingRight: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { color: colors.text, fontSize: 13, fontWeight: '500' },
  chipTextActive: { color: colors.surface, fontWeight: '700' },
  session: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.mint, borderRadius: 12, padding: 12 },
  sessionText: { color: colors.text, fontSize: 13, lineHeight: 20, flexShrink: 1 },
  slot: { minWidth: 120, alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  slotOff: { backgroundColor: colors.grey, borderColor: colors.grey },
  slotOffText: { color: colors.muted, textDecorationLine: 'line-through' },
  slotOffNote: { color: colors.muted, fontSize: 10, lineHeight: 14 },
  payChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  success: { alignItems: 'center', gap: 14, paddingTop: 12 },
  successIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  successTitle: { color: colors.text, fontSize: 20, lineHeight: 28, fontWeight: '700' },
  serialBadge: { alignItems: 'center', backgroundColor: colors.brandSoft, borderRadius: 18, paddingHorizontal: 28, paddingVertical: 12 },
  serialLabel: { color: colors.brand, fontSize: 11, fontWeight: '700' },
  centerSub: { textAlign: 'center' },
  serialNumber: { color: colors.brand, fontSize: 44, lineHeight: 56, fontWeight: '700' },
  successCard: { alignSelf: 'stretch', gap: 4 },
  when: { color: colors.brand, fontSize: 13, lineHeight: 20, fontWeight: '600' },
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(30,43,39,0.45)' },
  sheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%',
    width: '100%', maxWidth: 560, alignSelf: 'center', paddingBottom: 12,
  },
  handle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: colors.border, marginTop: 10 },
  sheetBody: { padding: 16, gap: 12 },
  review: { gap: 10 },
  reviewRow: { gap: 1 },
  toggle: { flexDirection: 'row', backgroundColor: colors.mint2, borderRadius: 14, padding: 4, gap: 4 },
  toggleItem: { flex: 1, minHeight: 44, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  toggleActive: { backgroundColor: colors.surface },
  toggleText: { color: colors.muted, fontSize: 14, fontWeight: '600' },
  toggleTextActive: { color: colors.brand },
  otherFields: { gap: 8 },
  input: {
    minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
    paddingHorizontal: 14, color: colors.text, fontSize: 15, fontFamily: FONT_FAMILIES.regular,
  },
  inputError: { borderColor: colors.danger },
  errorCard: { backgroundColor: colors.yellow, borderColor: colors.yellow },
  errorText: { color: colors.yellowText, fontSize: 13, lineHeight: 20 },
});
