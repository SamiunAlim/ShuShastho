import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ActionButton, AppScreen, AppText, BiText, Card, DemoNotice, KanthaCard, ScreenHeader } from '../../components/ui';
import type { TranslationKey } from '../../constants/i18n';
import { useQueuePoll } from '../../hooks/usePolling';
import { useJourney } from '../../context/JourneyContext';
import { useLanguage } from '../../context/LanguageContext';
import { useQueue } from '../../context/QueueContext';
import colors from '../../constants/colors';
import { cancelAppointment, getMyAppointments, subscribeAppointments, type Appointment } from '../../services/data';
import { useDesk } from '../../context/DeskContext';
import { DEMO, findDepartment, findDoctor, findHospital, timeLabel, type Localized } from '../../services/mock';
import { addDays, formatTaka, MONTHS_SHORT, toIsoDate, WEEKDAYS } from '../../utils/format';
import { METHOD_NAME_KEY } from '../../utils/payment';

type StepState = 'done' | 'current' | 'upcoming';
type ApptStatus = 'booked' | 'checkedIn' | 'done' | 'cancelled';

const STATUS_STYLE: Record<ApptStatus, { label: TranslationKey; bg: string; fg: string }> = {
  booked: { label: 'stBooked', bg: colors.blue, fg: colors.blueText },
  checkedIn: { label: 'stCheckedIn', bg: colors.mint2, fg: colors.brand },
  done: { label: 'stDone', bg: colors.grey, fg: colors.muted },
  cancelled: { label: 'stCancelled', bg: colors.redSoft, fg: colors.danger },
};

const byWhen = (a: Appointment, b: Appointment) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`);

export default function SerialsScreen() {
  const { language, t, tf, nf, L } = useLanguage();
  const queue = useQueue();
  function shortDate(a: Appointment) {
    const [, m, d] = a.date.split('-').map(Number);
    const label = a.date === toIsoDate(new Date()) ? t('today') : a.date === toIsoDate(addDays(new Date(), 1)) ? t('tomorrow') : `${nf(d)} ${MONTHS_SHORT[language][m - 1]}`;
    return `${label} · ${timeLabel(a.time)[language]}`;
  }
  useQueuePoll();
  const doctor = findDoctor(queue.doctorId);
  const journey = useJourney();
  const [consulting, setConsulting] = useState(false);
  const desk = useDesk();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [confirmCancel, setConfirmCancel] = useState('');
  // Reload the list whenever the tab is shown (e.g. right after booking) and after any change.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      const load = () => { getMyAppointments().then((list) => active && setAppointments(list)); };
      load();
      const unsubscribe = subscribeAppointments(load);
      return () => { active = false; unsubscribe(); };
    }, []),
  );

  const today = toIsoDate(new Date());
  const isTracked = (a: Appointment) => a.doctorId === queue.doctorId && a.serial === queue.serial;

  function statusOf(a: Appointment): ApptStatus {
    if (a.status === 'cancelled') return 'cancelled';
    if (a.date < today) return 'done';
    if (isTracked(a)) {
      if (journey.consulted || queue.nowServing > a.serial) return 'done';
      const atDesk = a.doctorId === DEMO.doctorId && desk.patients.some((p) => p.serial === a.serial && p.checkedIn);
      if (atDesk || queue.nowServing >= a.serial) return 'checkedIn';
    }
    return 'booked';
  }

  // Upcoming (today or later, not cancelled), soonest first. The live queue card follows one of them.
  const upcoming = appointments.filter((a) => a.status !== 'cancelled' && a.date >= today).sort(byWhen);
  const selected = upcoming.find(isTracked);
  const firstUpcoming = upcoming[0];
  const trackedKey = `${queue.doctorId}#${queue.serial}`;
  useEffect(() => {
    // Nothing tracked (e.g. the tracked serial was cancelled): follow the next upcoming one.
    if (!selected && firstUpcoming) queue.bookSerial({ doctorId: firstUpcoming.doctorId, serial: firstUpcoming.serial });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id, firstUpcoming?.id, trackedKey]);

  async function cancel(id: string) {
    setConfirmCancel('');
    await cancelAppointment(id);
  }
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  // Simulated consultation: short pause, then the prescription opens.
  function startConsultation() {
    setConsulting(true);
    timer.current = setTimeout(() => {
      journey.completeConsultation();
      setConsulting(false);
      router.push('/prescription');
    }, DEMO.consultationMs);
  }

  // Booked + checked in are always done; waiting is current until the turn arrives; then consultation.
  const steps: { label: Localized; state: StepState }[] = [
    { label: L('booked'), state: 'done' },
    { label: L('checkedIn'), state: 'done' },
    { label: L('waitingState'), state: queue.isMyTurn ? 'done' : 'current' },
    { label: L('consultation'), state: journey.consulted ? 'done' : queue.isMyTurn ? 'current' : 'upcoming' },
  ];

  return (
    <AppScreen
      header={
        <ScreenHeader title={L('serials')}>
          <BiText text={L('serialsSubtitle')} style={styles.headerSubtitle} />
        </ScreenHeader>
      }
    >
      <DemoNotice compact />
      <NewSerialButton />
      {upcoming.length > 1 ? (
        <View style={styles.selector}>
          <BiText text={L('switchSerial')} style={styles.selectorTitle} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectorRow}>
            {upcoming.map((a) => {
              const active = isTracked(a);
              return (
                <Pressable
                  key={a.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => queue.bookSerial({ doctorId: a.doctorId, serial: a.serial })}
                  style={[styles.selectorChip, active && styles.selectorChipActive]}
                >
                  <AppText style={[styles.selectorText, active && styles.selectorTextActive]}>
                    #{nf(a.serial)} · {findDoctor(a.doctorId).name[language]}
                  </AppText>
                  <AppText style={[styles.selectorSub, active && styles.selectorTextActive]}>{shortDate(a)}</AppText>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
      {!selected ? (
        <Card style={styles.infoCard}>
          <AppText style={styles.meta}>{t('noUpcomingSerial')}</AppText>
        </Card>
      ) : (
      <KanthaCard style={styles.queueCard}>
        <View style={styles.queueHeader}>
          <View style={styles.flex}>
            <View style={styles.liveRow}>
              <Ionicons name="ellipse" size={8} color={colors.danger} />
              <AppText style={styles.liveLabel}>{t('queueLive')}</AppText>
            </View>
            <AppText style={styles.queueTitle}>{doctor.name[language]}</AppText>
            <AppText style={styles.meta}>{findHospital(doctor.hospitalId).name[language]}</AppText>
          </View>
          <View style={styles.queueNumber}>
            <BiText text={L('yourSerial')} style={styles.queueSmall} subStyle={styles.centerSub} />
            <AppText style={styles.number}>#{nf(queue.serial)}</AppText>
          </View>
        </View>

        {queue.isMyTurn && (
          <View style={styles.turnBanner}>
            <Ionicons name="notifications" size={18} color={colors.brand} />
            <AppText style={styles.turnText}>{t('yourTurn')}</AppText>
          </View>
        )}
        {queue.isMyTurn && (
          journey.consulted ? (
            <ActionButton label={t('viewPrescription')} onPress={() => router.push('/prescription')} />
          ) : (
            <ActionButton
              label={consulting ? t('consultingNow') : t('startConsultation')}
              onPress={startConsultation}
              disabled={consulting}
            />
          )
        )}

        <View style={styles.metrics}>
          <Metric label={L('nowServing')} value={`#${nf(queue.nowServing)}`} />
          <Metric label={L('ahead')} value={nf(queue.ahead)} />
          <Metric
            label={L('estimatedWait')}
            value={queue.isMyTurn ? '—' : `~${tf('minutes', { n: queue.estimatedMinutes })}`}
          />
        </View>

        <View style={styles.progress}>
          <View style={styles.progressLine} />
          {steps.map((step) => (
            <View key={step.label.en} style={styles.progressStep}>
              <View
                style={[
                  styles.progressDot,
                  step.state === 'done' && styles.progressDone,
                  step.state === 'current' && styles.progressCurrent,
                ]}
              >
                {step.state === 'done' && <Ionicons name="checkmark" size={10} color={colors.surface} />}
              </View>
              <BiText
                text={step.label}
                style={[
                  styles.progressText,
                  step.state !== 'upcoming' && styles.progressTextActive,
                ]}
                subStyle={styles.progressSub}
              />
            </View>
          ))}
        </View>
        <View style={styles.notice}><AppText style={styles.noticeText}>{t('queueEstimateNotice')}</AppText></View>
      </KanthaCard>
      )}
      <Card style={styles.infoCard}>
        <BiText text={L('checkInTitle')} style={styles.infoTitle} />
        <AppText style={styles.meta}>{t('checkInDescription')}</AppText>
      </Card>

      <BiText text={L('bkMyAppointments')} style={styles.listTitle} />
      {appointments.length === 0 ? (
        <Card style={styles.infoCard}>
          <AppText style={styles.meta}>{t('bkNoAppointments')}</AppText>
          <ActionButton label={t('newSerial')} onPress={() => router.push('/new-serial')} />
        </Card>
      ) : null}
      {[...upcoming, ...appointments.filter((a) => !upcoming.includes(a)).sort((a, b) => byWhen(b, a))].map((appointment) => {
        const apptDoctor = findDoctor(appointment.doctorId);
        const [y, m, d] = appointment.date.split('-').map(Number);
        const when = `${WEEKDAYS[language][new Date(y, m - 1, d).getDay()]}, ${nf(d)} ${MONTHS_SHORT[language][m - 1]} · ${timeLabel(appointment.time)[language]}`;
        const status = statusOf(appointment);
        const chip = STATUS_STYLE[status];
        const canCancel = status === 'booked';
        const patientName = appointment.patient.forSelf
          ? null
          : tf('apptFor', { name: appointment.patient.name });
        return (
          <Card key={appointment.id} style={styles.apptCard}>
            <View style={styles.apptTop}>
              <View style={styles.flex}>
                <AppText style={styles.apptDoctor}>{apptDoctor.name[language]}</AppText>
                <AppText style={styles.meta}>
                  {findDepartment(appointment.departmentId)?.name[language]} · {findHospital(appointment.hospitalId).name[language]}
                </AppText>
              </View>
              <View style={styles.apptSerial}>
                <AppText style={styles.apptSerialText}>#{nf(appointment.serial)}</AppText>
              </View>
            </View>
            <View style={styles.apptTop}>
              <View style={styles.flex}><AppText style={styles.apptWhen}>{when}</AppText></View>
              <View style={[styles.statusChip, { backgroundColor: chip.bg }]}>
                <AppText style={[styles.statusText, { color: chip.fg }]}>{t(chip.label)}</AppText>
              </View>
            </View>
            {patientName ? <AppText style={styles.meta}>{patientName}</AppText> : null}
            {appointment.payment?.status === 'paid' ? (
              <View style={styles.paidRow}>
                <Ionicons name="checkmark-circle" size={14} color={colors.brand} />
                <AppText style={styles.paidText}>
                  {t('payPaidVia').replace('{method}', t(METHOD_NAME_KEY[appointment.payment.method]))}
                  {appointment.payment.transactionId ? ` · ${appointment.payment.transactionId}` : ''}
                </AppText>
              </View>
            ) : (
              <AppText style={styles.meta}>{tf('payAtChamber', { amount: formatTaka(appointment.payment?.amount ?? appointment.fee) })}</AppText>
            )}
            {canCancel ? (
              confirmCancel === appointment.id ? (
                <View style={styles.cancelRow}>
                  <AppText style={styles.cancelAsk}>{t('cancelAsk')}</AppText>
                  <Pressable accessibilityRole="button" onPress={() => { void cancel(appointment.id); }} style={[styles.cancelBtn, styles.cancelBtnDanger]}>
                    <AppText style={styles.cancelBtnDangerText}>{t('cancelYes')}</AppText>
                  </Pressable>
                  <Pressable accessibilityRole="button" onPress={() => setConfirmCancel('')} style={styles.cancelBtn}>
                    <AppText style={styles.cancelBtnText}>{t('cancelKeep')}</AppText>
                  </Pressable>
                </View>
              ) : (
                <Pressable accessibilityRole="button" onPress={() => setConfirmCancel(appointment.id)} style={[styles.cancelBtn, styles.cancelStart]}>
                  <AppText style={styles.cancelBtnText}>{t('cancelAppt')}</AppText>
                </Pressable>
              )
            ) : null}
          </Card>
        );
      })}
    </AppScreen>
  );
}

/** Prominent entry to the quick booking flow (also used by the empty state). */
function NewSerialButton() {
  const { L } = useLanguage();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push('/new-serial')}
      style={({ pressed }) => [styles.newSerial, pressed && { opacity: 0.85 }]}
    >
      <View style={styles.newSerialIcon}><Ionicons name="add" size={26} color={colors.brand} /></View>
      <BiText text={L('newSerial')} style={styles.newSerialText} hideSub />
    </Pressable>
  );
}

function Metric({ label, value }: { label: Localized; value: string }) {
  return (
    <View style={styles.metric}>
      <AppText style={styles.metricValue}>{value}</AppText>
      <BiText text={label} style={styles.metricLabel} subStyle={styles.centerSub} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerSubtitle: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  centerSub: { textAlign: 'center' },
  progressSub: { fontSize: 9, lineHeight: 13 },
  queueCard: { gap: 18 },
  queueHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveLabel: { color: colors.danger, fontSize: 11, letterSpacing: 0.8, fontWeight: '700' },
  queueTitle: { color: colors.text, fontSize: 17, lineHeight: 26, fontWeight: '700' },
  meta: { color: colors.muted, fontSize: 12, lineHeight: 19 },
  queueNumber: { borderRadius: 14, backgroundColor: colors.brandSoft, alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8 },
  queueSmall: { color: colors.brand, fontSize: 10, fontWeight: '700' },
  number: { color: colors.brand, fontSize: 26, lineHeight: 34, fontWeight: '700' },
  turnBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.mint2, borderRadius: 12, padding: 12 },
  turnText: { color: colors.brand, fontSize: 15, fontWeight: '700' },
  metrics: { flexDirection: 'row', borderRadius: 14, backgroundColor: colors.mint, paddingVertical: 14 },
  metric: { flex: 1, alignItems: 'center', gap: 2 },
  metricValue: { color: colors.text, fontSize: 18, lineHeight: 26, fontWeight: '700' },
  metricLabel: { color: colors.muted, fontSize: 11, textAlign: 'center' },
  progress: { justifyContent: 'space-between', flexDirection: 'row', position: 'relative', paddingTop: 3 },
  progressLine: { position: 'absolute', top: 11, height: 2, left: 10, right: 20, backgroundColor: colors.border },
  progressStep: { width: '25%', gap: 7, alignItems: 'flex-start' },
  progressDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  progressDone: { backgroundColor: colors.brand, borderColor: colors.brand },
  progressCurrent: { borderColor: colors.brand, backgroundColor: colors.mint3 },
  progressText: { color: colors.muted, fontSize: 10, lineHeight: 15 },
  progressTextActive: { color: colors.brand, fontWeight: '600' },
  notice: { backgroundColor: colors.yellow, padding: 11, borderRadius: 12 },
  noticeText: { color: colors.yellowText, fontSize: 11, lineHeight: 17 },
  infoCard: { gap: 6 },
  listTitle: { color: colors.text, fontSize: 16, lineHeight: 24, fontWeight: '700', marginTop: 4 },
  newSerial: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 56, borderRadius: 16, backgroundColor: colors.brand, paddingHorizontal: 16 },
  newSerialIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  newSerialText: { color: colors.surface, fontSize: 16, lineHeight: 24, fontWeight: '700' },
  selector: { gap: 8 },
  selectorTitle: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  selectorRow: { gap: 8, paddingRight: 8 },
  selectorChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  selectorChipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  selectorText: { color: colors.text, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  selectorSub: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  selectorTextActive: { color: colors.surface },
  statusChip: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '700' },
  cancelStart: { alignSelf: 'flex-start' },
  cancelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  cancelAsk: { color: colors.text, fontSize: 12, fontWeight: '600' },
  cancelBtn: { minHeight: 34, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { color: colors.text, fontSize: 12, fontWeight: '600' },
  cancelBtnDanger: { backgroundColor: colors.danger, borderColor: colors.danger },
  cancelBtnDangerText: { color: colors.surface, fontSize: 12, fontWeight: '700' },
  apptCard: { gap: 6 },
  paidRow: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: colors.mint2, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  paidText: { color: colors.brand, fontSize: 12, lineHeight: 18, fontWeight: '600' },
  apptTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  apptDoctor: { color: colors.text, fontSize: 15, lineHeight: 22, fontWeight: '700' },
  apptSerial: { borderRadius: 12, backgroundColor: colors.brandSoft, paddingHorizontal: 12, paddingVertical: 6 },
  apptSerialText: { color: colors.brand, fontSize: 16, fontWeight: '700' },
  apptWhen: { color: colors.brand, fontSize: 13, lineHeight: 20, fontWeight: '600' },
  infoTitle: { color: colors.text, fontSize: 15, lineHeight: 23, fontWeight: '700' },
});
