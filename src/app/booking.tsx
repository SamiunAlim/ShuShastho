import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { PaymentSheet } from '../components/PaymentSheet';
import { StepIndicator } from '../components/StepIndicator';
import { ActionButton, AppScreen, AppText, BiText, Card, FONT_FAMILIES, ScreenHeader } from '../components/ui';
import colors from '../constants/colors';
import type { TranslationKey } from '../constants/i18n';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useQueue } from '../context/QueueContext';
import {
  createAppointment,
  getDepartments,
  getDoctors,
  getHospitals,
  getSlots,
  type DepartmentWithCount,
  type PatientInfo,
  type PaymentInfo,
  type PaymentMethod,
} from '../services/data';
import { findDepartment, findDoctor, findHospital, matchDepartment, type DemoDoctor, type Hospital, type Slot } from '../services/mock';
import { addDays, formatTaka, MONTHS_SHORT, toIsoDate, toAsciiDigits, WEEKDAYS } from '../utils/format';
import { goBack } from '../utils/navigation';
import { clockTime, METHOD_ICON, METHOD_NAME_KEY } from '../utils/payment';

const STEP_KEYS: TranslationKey[] = ['bkStepHospital', 'bkStepDepartment', 'bkStepDoctor', 'bkStepDate', 'bkStepPatient', 'bkStepPayment', 'bkStepReview'];
const STEP = { hospital: 0, department: 1, doctor: 2, date: 3, patient: 4, payment: 5, review: 6 } as const;
const DAYS_AHEAD = 5;

const GENDERS: { key: PatientInfo['gender']; label: TranslationKey }[] = [
  { key: 'male', label: 'pfMale' },
  { key: 'female', label: 'pfFemale' },
  { key: 'other', label: 'pfOther' },
];

type PatientFields = Omit<PatientInfo, 'forSelf'>;
const PAYMENT_METHODS: PaymentMethod[] = ['cash_at_chamber', 'bkash', 'nagad', 'card'];

const EMPTY_FIELDS: PatientFields = { name: '', age: '', gender: '', relation: '', phone: '' };

function newIdempotencyKey() {
  return `booking-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function BookingScreen() {
  const params = useLocalSearchParams<{ doctorId?: string; department?: string }>();
  const { language, t, tf, nf, L } = useLanguage();
  const { profile, session } = useAuth();
  const queue = useQueue();
  const idempotencyKey = useRef(newIdempotencyKey());

  // Opened from a doctor card: hospital, department and doctor are known, so start at the date.
  // Opened from the AI assistant: the suggested department is highlighted on the department step.
  const presetDoctor = typeof params.doctorId === 'string' ? findDoctor(params.doctorId) : undefined;
  const suggestedDepartment = useMemo(() => {
    if (presetDoctor || typeof params.department !== 'string') return undefined;
    return findDepartment(params.department)?.id ?? matchDepartment(params.department);
  }, [presetDoctor, params.department]);

  const [step, setStep] = useState<number>(presetDoctor ? STEP.date : STEP.hospital);
  const [hospitalId, setHospitalId] = useState(presetDoctor?.hospitalId ?? '');
  const [departmentId, setDepartmentId] = useState(presetDoctor?.departmentId ?? '');
  const [doctorId, setDoctorId] = useState(presetDoctor?.id ?? '');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  const [forSelf, setForSelf] = useState(true);
  const [self, setSelf] = useState<PatientFields>({
    name: profile?.name ?? '',
    age: profile?.age ?? '',
    gender: profile?.gender ?? '',
    relation: '',
    phone: session?.phone ?? '',
  });
  const [other, setOther] = useState<PatientFields>(EMPTY_FIELDS);
  const [reason, setReason] = useState('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash_at_chamber');
  const [paid, setPaid] = useState<PaymentInfo | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [departments, setDepartments] = useState<DepartmentWithCount[]>([]);
  const [doctorList, setDoctorList] = useState<DemoDoctor[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);

  const days = useMemo(() => {
    const today = new Date();
    return Array.from({ length: DAYS_AHEAD }, (_, offset) => {
      const d = addDays(today, offset);
      return { value: toIsoDate(d), offset, weekday: d.getDay(), day: d.getDate(), month: d.getMonth() };
    });
  }, []);
  const selectedDate = date || days[0].value;

  useEffect(() => {
    let active = true;
    getHospitals().then((list) => active && setHospitals(list));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!hospitalId) return;
    let active = true;
    getDepartments(hospitalId).then((list) => active && setDepartments(list));
    return () => { active = false; };
  }, [hospitalId]);

  useEffect(() => {
    if (!hospitalId || !departmentId) return;
    let active = true;
    getDoctors({ hospitalId, departmentId }).then((list) => active && setDoctorList(list));
    return () => { active = false; };
  }, [hospitalId, departmentId]);

  useEffect(() => {
    if (!doctorId) return;
    let active = true;
    getSlots(doctorId, selectedDate).then((list) => {
      if (!active) return;
      setSlots(list);
      // Drop a chosen time that is not free on the newly selected day.
      setTime((current) => (list.some((slot) => slot.time === current && slot.available) ? current : ''));
    });
    return () => { active = false; };
  }, [doctorId, selectedDate]);

  const doctor = doctorId ? findDoctor(doctorId) : undefined;
  const hospital = hospitalId ? findHospital(hospitalId) : undefined;
  const department = findDepartment(departmentId);
  const fields = forSelf ? self : other;
  const setFields = forSelf ? setSelf : setOther;
  const patch = (changes: Partial<PatientFields>) => setFields((current) => ({ ...current, ...changes }));

  function dayLabel(day: (typeof days)[number]) {
    const name = day.offset === 0 ? t('today') : day.offset === 1 ? t('tomorrow') : WEEKDAYS[language][day.weekday];
    return `${name} · ${nf(day.day)} ${MONTHS_SHORT[language][day.month]}`;
  }

  function fullDate(iso: string) {
    const [y, m, d] = iso.split('-').map(Number);
    const parsed = new Date(y, m - 1, d);
    return `${WEEKDAYS[language][parsed.getDay()]}, ${nf(d)} ${MONTHS_SHORT[language][m - 1]}`;
  }

  // Step 5 validation.
  const ageNumber = Number(fields.age);
  const nameOk = fields.name.trim().length > 0;
  const ageOk = Number.isInteger(ageNumber) && ageNumber > 0 && ageNumber < 120;
  const relationOk = forSelf || fields.relation.trim().length > 0;
  const phoneOk = fields.phone === '' || fields.phone.length >= 6;
  const patientOk = nameOk && ageOk && relationOk && phoneOk;

  function chooseHospital(id: string) {
    if (id !== hospitalId) {
      setHospitalId(id);
      setDepartmentId('');
      setDoctorId('');
      setDoctorList([]);
      setTime('');
    }
    setStep(STEP.department);
  }

  function chooseDepartment(id: string) {
    if (id !== departmentId) {
      setDepartmentId(id);
      setDoctorId('');
      setDoctorList([]);
      setTime('');
    }
    setStep(STEP.doctor);
  }

  function chooseDoctor(id: string) {
    if (id !== doctorId) {
      setDoctorId(id);
      setSlots([]);
      setTime('');
    }
    setStep(STEP.date);
  }

  const fee = doctor?.fee ?? 0;
  const needsOnlinePayment = payMethod !== 'cash_at_chamber' && paid?.method !== payMethod;
  const payment: PaymentInfo = payMethod === 'cash_at_chamber' || !paid
    ? { method: 'cash_at_chamber', status: 'pay_at_chamber', amount: fee }
    : paid;

  function choosePayMethod(method: PaymentMethod) {
    setPayMethod(method);
    if (paid && paid.method !== method) setPaid(null);
  }

  function next() {
    if (step === STEP.patient) {
      setTouched(true);
      if (!patientOk) return;
    }
    if (step === STEP.payment && needsOnlinePayment) {
      setSheetOpen(true);
      return;
    }
    setStep((current) => Math.min(STEP.review, current + 1));
  }

  function back() {
    if (step === STEP.hospital || (presetDoctor && step === STEP.date)) goBack('/(tabs)');
    else setStep((current) => Math.max(STEP.hospital, current - 1));
  }

  async function confirmBooking() {
    if (submitting || !doctor) return;
    setError('');
    setSubmitting(true);
    try {
      const appointment = await createAppointment({
        doctorId: doctor.id,
        date: selectedDate,
        time,
        patient: { forSelf, ...fields, relation: forSelf ? '' : fields.relation.trim(), name: fields.name.trim() },
        reason: reason.trim(),
        payment,
        idempotencyKey: idempotencyKey.current,
      });
      queue.bookSerial({ doctorId: doctor.id, serial: appointment.serial });
      router.replace('/(tabs)/serials');
    } catch {
      setError(t('connectionError'));
      setSubmitting(false);
    }
  }

  const footer =
    step === STEP.date ? <ActionButton label={t('bkNext')} onPress={next} disabled={!time} />
    : step === STEP.patient ? <ActionButton label={t('bkNext')} onPress={next} />
    : step === STEP.payment ? (
      <ActionButton
        label={needsOnlinePayment ? t('payNext').replace('{amount}', nf(formatTaka(fee))) : t('bkNext')}
        onPress={next}
      />
    )
    : step === STEP.review ? (
      <ActionButton label={submitting ? '…' : t('confirmBooking')} onPress={confirmBooking} disabled={submitting} />
    ) : undefined;

  return (
    <AppScreen
      header={
        <ScreenHeader title={L('bookingTitle')} onBack={back}>
          <StepIndicator steps={STEP_KEYS.map((key) => L(key))} current={step} />
        </ScreenHeader>
      }
      footer={footer ? <View style={styles.footer}>{footer}</View> : undefined}
    >
      {step === STEP.hospital && (
        <>
          <BiText text={L('bkChooseHospital')} style={styles.sectionTitle} />
          {hospitals.map((item) => (
            <Option key={item.id} selected={item.id === hospitalId} onPress={() => chooseHospital(item.id)}>
              <View style={styles.optionIcon}><Ionicons name="business-outline" size={22} color={colors.brand} /></View>
              <View style={styles.flex}>
                <AppText style={styles.optionTitle}>{item.name[language]}</AppText>
                <AppText style={styles.meta}>{item.area[language]}</AppText>
              </View>
            </Option>
          ))}
        </>
      )}

      {step === STEP.department && (
        <>
          <BiText text={L('bkChooseDepartment')} style={styles.sectionTitle} />
          {hospital ? <AppText style={styles.meta}>{hospital.name[language]}</AppText> : null}
          {suggestedDepartment && !departments.some((d) => d.id === suggestedDepartment) && departments.length > 0 ? (
            <View style={styles.warn}>
              <AppText style={styles.warnText}>
                {t('bkDeptNotAtHospital').replace('{dept}', findDepartment(suggestedDepartment)?.name[language] ?? '')}
              </AppText>
            </View>
          ) : null}
          {departments.map((item) => {
            const suggested = item.id === suggestedDepartment;
            return (
              <Option key={item.id} selected={item.id === departmentId || (!departmentId && suggested)} onPress={() => chooseDepartment(item.id)}>
                <View style={styles.optionIcon}><Ionicons name={item.icon} size={22} color={colors.brand} /></View>
                <View style={styles.flex}>
                  <AppText style={styles.optionTitle}>{item.name[language]}</AppText>
                  <AppText style={styles.meta}>{tf('bkDoctorCount', { n: item.doctorCount })}</AppText>
                </View>
                {suggested ? (
                  <View style={styles.badge}>
                    <Ionicons name="sparkles-outline" size={12} color={colors.brand} />
                    <AppText style={styles.badgeText}>{t('bkSuggestedByAi')}</AppText>
                  </View>
                ) : null}
              </Option>
            );
          })}
        </>
      )}

      {step === STEP.doctor && (
        <>
          <BiText text={L('bkChooseDoctor')} style={styles.sectionTitle} />
          <AppText style={styles.meta}>{department?.name[language]} · {hospital?.name[language]}</AppText>
          {doctorList.map((item) => (
            <Option key={item.id} selected={item.id === doctorId} onPress={() => chooseDoctor(item.id)}>
              <View style={styles.avatar}><AppText style={styles.avatarText}>{item.initials[language]}</AppText></View>
              <View style={styles.flex}>
                <AppText style={styles.optionTitle}>{item.name[language]}</AppText>
                <AppText style={styles.meta}>{item.specialty[language]}</AppText>
                <AppText style={styles.meta}>{item.degrees[language]}</AppText>
                <AppText style={styles.meta}>{item.chambers[0].room[language]} · {item.chambers[0].days[language]}</AppText>
              </View>
              <View style={styles.feeCol}>
                <AppText style={styles.fee}>{nf(formatTaka(item.fee))}</AppText>
                <View style={styles.rating}>
                  <Ionicons name="star" size={11} color={colors.yellowText} />
                  <AppText style={styles.ratingText}>{nf(item.rating.toFixed(1))}</AppText>
                </View>
              </View>
            </Option>
          ))}
          {doctorList.length === 0 ? <AppText style={styles.empty}>{t('bkNoDoctors')}</AppText> : null}
        </>
      )}

      {step === STEP.date && doctor && (
        <>
          <DoctorSummary doctor={doctor} />
          <BiText text={L('chooseDay')} style={styles.sectionTitle} />
          <View style={styles.chips}>
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
          </View>
          <BiText text={L('bkChooseSlot')} style={styles.sectionTitle} />
          <View style={styles.chips}>
            {slots.map((slot) => {
              const selected = time === slot.time;
              return (
                <Pressable
                  key={slot.time}
                  accessibilityRole="button"
                  accessibilityState={{ selected, disabled: !slot.available }}
                  disabled={!slot.available}
                  onPress={() => setTime(slot.time)}
                  style={[styles.slot, selected && styles.chipActive, !slot.available && styles.slotOff]}
                >
                  <AppText style={[styles.chipText, selected && styles.chipTextActive, !slot.available && styles.slotOffText]}>
                    {slot.label[language]}
                  </AppText>
                  {!slot.available ? <AppText style={styles.slotOffNote}>{t('bkSlotBooked')}</AppText> : null}
                </Pressable>
              );
            })}
          </View>
          {slots.length > 0 && slots.every((slot) => !slot.available) ? <AppText style={styles.empty}>{t('bkNoSlots')}</AppText> : null}
        </>
      )}

      {step === STEP.patient && (
        <>
          <BiText text={L('bkPatientTitle')} style={styles.sectionTitle} />
          <View style={styles.toggle}>
            {([true, false] as const).map((value) => (
              <Pressable
                key={String(value)}
                accessibilityRole="radio"
                accessibilityState={{ selected: forSelf === value }}
                onPress={() => { setForSelf(value); setTouched(false); }}
                style={[styles.toggleItem, forSelf === value && styles.toggleActive]}
              >
                <AppText style={[styles.toggleText, forSelf === value && styles.toggleTextActive]}>
                  {t(value ? 'bkForMe' : 'bkForSomeone')}
                </AppText>
              </Pressable>
            ))}
          </View>

          <FieldBlock label={L('bkPatientName')} error={touched && !nameOk ? t('pfNameRequired') : ''}>
            <TextInput
              accessibilityLabel={t('bkPatientName')}
              value={fields.name}
              onChangeText={(text) => patch({ name: text })}
              style={[styles.input, touched && !nameOk && styles.inputError]}
            />
          </FieldBlock>
          <View style={styles.row}>
            <View style={styles.flex}>
              <FieldBlock label={L('pfAge')} error={touched && !ageOk ? t('pfAgeInvalid') : ''}>
                <TextInput
                  accessibilityLabel={t('pfAge')}
                  value={nf(fields.age)}
                  onChangeText={(text) => patch({ age: toAsciiDigits(text).replace(/\D/g, '').slice(0, 3) })}
                  keyboardType="number-pad"
                  style={[styles.input, touched && !ageOk && styles.inputError]}
                />
              </FieldBlock>
            </View>
            <View style={styles.flex2}>
              <FieldBlock label={L('pfGender')}>
                <View style={styles.chips}>
                  {GENDERS.map((g) => (
                    <Pressable
                      key={g.key}
                      accessibilityRole="button"
                      accessibilityState={{ selected: fields.gender === g.key }}
                      onPress={() => patch({ gender: g.key })}
                      style={[styles.chip, fields.gender === g.key && styles.chipActive]}
                    >
                      <AppText style={[styles.chipText, fields.gender === g.key && styles.chipTextActive]}>{t(g.label)}</AppText>
                    </Pressable>
                  ))}
                </View>
              </FieldBlock>
            </View>
          </View>
          {!forSelf ? (
            <FieldBlock label={L('bkRelation')} error={touched && !relationOk ? t('bkRelationRequired') : ''}>
              <TextInput
                accessibilityLabel={t('bkRelation')}
                value={fields.relation}
                onChangeText={(text) => patch({ relation: text })}
                placeholder={t('bkRelationHint')}
                placeholderTextColor={colors.muted}
                style={[styles.input, touched && !relationOk && styles.inputError]}
              />
            </FieldBlock>
          ) : null}
          <FieldBlock label={L('bkPhone')} error={touched && !phoneOk ? t('phoneInvalid') : ''}>
            <TextInput
              accessibilityLabel={t('bkPhone')}
              value={nf(fields.phone)}
              onChangeText={(text) => patch({ phone: toAsciiDigits(text).replace(/\D/g, '').slice(0, 11) })}
              keyboardType="phone-pad"
              style={[styles.input, touched && !phoneOk && styles.inputError]}
            />
          </FieldBlock>
          <FieldBlock label={L('bkReason')}>
            <TextInput
              accessibilityLabel={t('bkReason')}
              value={reason}
              onChangeText={setReason}
              placeholder={t('bkReasonHint')}
              placeholderTextColor={colors.muted}
              multiline
              style={[styles.input, styles.multiline]}
            />
            <AppText style={styles.meta}>{t('bkReasonOptional')}</AppText>
          </FieldBlock>
        </>
      )}

      {step === STEP.payment && doctor && (
        <>
          <BiText text={L('payTitle')} style={styles.sectionTitle} />
          <Card style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <BiText text={L('consultationFee')} style={styles.meta} />
              <AppText style={styles.fee}>{nf(formatTaka(fee))}</AppText>
            </View>
          </Card>
          {PAYMENT_METHODS.map((method) => (
            <Option key={method} selected={payMethod === method} onPress={() => choosePayMethod(method)}>
              <View style={styles.optionIcon}><Ionicons name={METHOD_ICON[method]} size={22} color={colors.brand} /></View>
              <View style={styles.flex}>
                <AppText style={styles.optionTitle}>{t(METHOD_NAME_KEY[method])}</AppText>
                <AppText style={styles.meta}>
                  {t(method === 'cash_at_chamber' ? 'payCashHint' : 'payOnlineHint').replace('{amount}', nf(formatTaka(fee)))}
                </AppText>
              </View>
              {paid?.method === method ? <Ionicons name="checkmark-circle" size={20} color={colors.brand} /> : null}
            </Option>
          ))}
          <View style={styles.warn}>
            <BiText text={L('payDemoBanner')} style={styles.warnText} />
          </View>
        </>
      )}

      {step === STEP.review && doctor && hospital && (
        <>
          <BiText text={L('bkReviewTitle')} style={styles.sectionTitle} />
          <Card style={styles.review}>
            <ReviewRow label={L('bkWhere')} value={hospital.name[language]} sub={`${department?.name[language] ?? ''} · ${doctor.chambers[0].room[language]}`} />
            <ReviewRow label={L('selectedDoctor')} value={doctor.name[language]} sub={doctor.specialty[language]} />
            <ReviewRow label={L('bkWhen')} value={fullDate(selectedDate)} sub={slots.find((slot) => slot.time === time)?.label[language]} />
            <ReviewRow
              label={L('bkPatient')}
              value={forSelf ? fields.name : tf('bkBookedFor', { name: fields.name, relation: fields.relation })}
              sub={`${nf(fields.age)}${fields.phone ? ` · ${nf(fields.phone)}` : ''}`}
            />
            {reason.trim() ? <ReviewRow label={L('bkReason')} value={reason.trim()} /> : null}
          </Card>
          <Card style={styles.review}>
            <View style={styles.summaryRow}>
              <BiText text={L('payment')} style={styles.meta} />
              <AppText style={styles.summaryValue}>
                {payment.status === 'paid'
                  ? t('payPaidVia').replace('{method}', t(METHOD_NAME_KEY[payment.method]))
                  : t('cashAtChamber')}
              </AppText>
            </View>
            {payment.status === 'paid' ? (
              <>
                <View style={styles.summaryRow}>
                  <AppText style={styles.meta}>{t('payTxn')}</AppText>
                  <AppText style={styles.summaryValue}>{payment.transactionId}</AppText>
                </View>
                <View style={styles.summaryRow}>
                  <AppText style={styles.meta}>{t('payTime')}</AppText>
                  <AppText style={styles.summaryValue}>{nf(clockTime(payment.paidAt ?? new Date().toISOString()))}</AppText>
                </View>
              </>
            ) : null}
            <View style={styles.summaryRow}>
              <BiText text={L('total')} style={styles.meta} />
              <AppText style={styles.fee}>{nf(formatTaka(doctor.fee))}</AppText>
            </View>
          </Card>
          {error ? <Card style={styles.errorCard}><AppText style={styles.errorText}>{error}</AppText></Card> : null}
        </>
      )}
      {sheetOpen && payMethod !== 'cash_at_chamber' ? (
        <PaymentSheet
          visible={sheetOpen}
          method={payMethod}
          amount={fee}
          onClose={() => setSheetOpen(false)}
          onPaid={(result) => {
            setPaid(result);
            setSheetOpen(false);
            setStep(STEP.review);
          }}
        />
      ) : null}
    </AppScreen>
  );
}

function Option({ selected, onPress, children }: { selected: boolean; onPress: () => void; children: React.ReactNode }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.option, selected && styles.optionActive, pressed && styles.pressed]}
    >
      {children}
      <Ionicons name="chevron-forward" size={18} color={colors.brand} />
    </Pressable>
  );
}

function DoctorSummary({ doctor }: { doctor: DemoDoctor }) {
  const { language, nf, L } = useLanguage();
  return (
    <Card style={styles.summaryCard}>
      <BiText text={L('selectedDoctor')} style={styles.label} />
      <AppText style={styles.optionTitle}>{doctor.name[language]}</AppText>
      <AppText style={styles.meta}>{doctor.specialty[language]} · {findHospital(doctor.hospitalId).name[language]}</AppText>
      <View style={styles.summaryRow}>
        <BiText text={L('consultationFee')} style={styles.meta} />
        <AppText style={styles.fee}>{nf(formatTaka(doctor.fee))}</AppText>
      </View>
    </Card>
  );
}

function FieldBlock({ label, error = '', children }: { label: { en: string; bn: string }; error?: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <BiText text={label} style={styles.label} />
      {children}
      {error ? <AppText style={styles.error}>{error}</AppText> : null}
    </View>
  );
}

function ReviewRow({ label, value, sub }: { label: { en: string; bn: string }; value: string; sub?: string }) {
  return (
    <View style={styles.reviewRow}>
      <BiText text={label} style={styles.label} />
      <AppText style={styles.optionTitle}>{value}</AppText>
      {sub ? <AppText style={styles.meta}>{sub}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flex2: { flex: 2 },
  footer: { flex: 1 },
  pressed: { opacity: 0.85 },
  sectionTitle: { color: colors.text, fontSize: 16, lineHeight: 24, fontWeight: '700' },
  label: { color: colors.muted, fontSize: 12, lineHeight: 18, fontWeight: '600' },
  meta: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  empty: { color: colors.muted, textAlign: 'center', padding: 20 },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1,
    borderColor: colors.border, backgroundColor: colors.surface,
  },
  optionActive: { borderColor: colors.brand, borderWidth: 2, backgroundColor: colors.mint },
  optionIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.mint2, alignItems: 'center', justifyContent: 'center' },
  optionTitle: { color: colors.text, fontSize: 15, lineHeight: 22, fontWeight: '700' },
  avatar: { width: 44, height: 44, borderRadius: 15, backgroundColor: colors.mint2, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.brand, fontSize: 15, fontWeight: '700' },
  feeCol: { alignItems: 'flex-end', gap: 4 },
  fee: { color: colors.brand, fontSize: 15, fontWeight: '700' },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: colors.yellow, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  ratingText: { color: colors.yellowText, fontSize: 11, fontWeight: '700' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.mint2, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { color: colors.brand, fontSize: 10, lineHeight: 14, fontWeight: '700' },
  warn: { backgroundColor: colors.yellow, padding: 12, borderRadius: 12 },
  warnText: { color: colors.yellowText, fontSize: 12, lineHeight: 18 },
  summaryCard: { gap: 6 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryValue: { color: colors.text, fontSize: 13, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { color: colors.text, fontSize: 13, fontWeight: '500' },
  chipTextActive: { color: colors.surface, fontWeight: '700' },
  slot: { minWidth: 104, alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  slotOff: { backgroundColor: colors.grey, borderColor: colors.grey },
  slotOffText: { color: colors.muted, textDecorationLine: 'line-through' },
  slotOffNote: { color: colors.muted, fontSize: 10, lineHeight: 14 },
  toggle: { flexDirection: 'row', backgroundColor: colors.mint2, borderRadius: 14, padding: 4, gap: 4 },
  toggleItem: { flex: 1, minHeight: 44, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  toggleActive: { backgroundColor: colors.surface },
  toggleText: { color: colors.muted, fontSize: 14, fontWeight: '600' },
  toggleTextActive: { color: colors.brand },
  field: { gap: 6 },
  row: { flexDirection: 'row', gap: 12 },
  input: {
    minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
    paddingHorizontal: 14, color: colors.text, fontSize: 15, fontFamily: FONT_FAMILIES.regular,
  },
  multiline: { minHeight: 84, paddingTop: 12, textAlignVertical: 'top' },
  inputError: { borderColor: colors.danger },
  error: { color: colors.danger, fontSize: 12, lineHeight: 17 },
  review: { gap: 12 },
  reviewRow: { gap: 2 },
  errorCard: { backgroundColor: colors.yellow, borderColor: colors.yellow },
  errorText: { color: colors.yellowText, fontSize: 13, lineHeight: 20 },
});
