import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActionButton, AppScreen, AppText, BiText, Card, DemoNotice, KanthaCard, ScreenHeader } from '../../components/ui';
import { useJourney } from '../../context/JourneyContext';
import { useLanguage } from '../../context/LanguageContext';
import { useQueue } from '../../context/QueueContext';
import colors from '../../constants/colors';
import { DEMO, findDoctor, type Localized } from '../../services/mock';

type StepState = 'done' | 'current' | 'upcoming';

export default function SerialsScreen() {
  const { language, t, tf, nf, L } = useLanguage();
  const queue = useQueue();
  const doctor = findDoctor(queue.doctorId);
  const journey = useJourney();
  const [consulting, setConsulting] = useState(false);
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
      <KanthaCard style={styles.queueCard}>
        <View style={styles.queueHeader}>
          <View style={styles.flex}>
            <View style={styles.liveRow}>
              <Ionicons name="ellipse" size={8} color={colors.danger} />
              <AppText style={styles.liveLabel}>{t('queueLive')}</AppText>
            </View>
            <AppText style={styles.queueTitle}>{doctor.name[language]}</AppText>
            <AppText style={styles.meta}>{DEMO.hospital[language]}</AppText>
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
      <Card style={styles.infoCard}>
        <BiText text={L('checkInTitle')} style={styles.infoTitle} />
        <AppText style={styles.meta}>{t('checkInDescription')}</AppText>
      </Card>
    </AppScreen>
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
  infoTitle: { color: colors.text, fontSize: 15, lineHeight: 23, fontWeight: '700' },
});
