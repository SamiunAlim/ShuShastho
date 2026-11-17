import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppScreen, AppText, BrandHeader, Card, DemoNotice, PageTitle } from '../../components/ui';
import { useLanguage } from '../../context/LanguageContext';
import colors from '../../constants/colors';

export default function SerialsScreen() {
  const { t } = useLanguage();
  return (
    <AppScreen>
      <BrandHeader />
      <DemoNotice compact />
      <PageTitle title={t('serials')} subtitle="Appointment status and queue updates" />
      <Card style={styles.queueCard}>
        <View style={styles.queueHeader}>
          <View>
            <AppText style={styles.liveLabel}>●  {t('queuePreview')}</AppText>
            <AppText style={styles.queueTitle}>Dr. Samira Hossain</AppText>
            <AppText style={styles.meta}>Dhaka Medical Centre · Dhanmondi</AppText>
          </View>
          <View style={styles.queueNumber}><AppText style={styles.queueSmall}>YOUR SERIAL</AppText><AppText style={styles.number}>05</AppText></View>
        </View>
        <View style={styles.metrics}>
          <Metric label={t('nowServing')} value="03" />
          <Metric label={t('waiting')} value="02" />
          <Metric label={t('estimatedWait')} value="~25 min" />
        </View>
        <View style={styles.progress}>
          <View style={styles.progressLine} />
          {[t('booked'), t('checkedIn'), t('waitingState'), t('consultation')].map((step, index) => (
            <View key={step} style={styles.progressStep}>
              <View style={[styles.progressDot, index < 3 && styles.progressDone]} />
              <AppText style={[styles.progressText, index < 3 && styles.progressTextDone]}>{step}</AppText>
            </View>
          ))}
        </View>
        <View style={styles.notice}><AppText style={styles.noticeText}>Queue times are estimates. Check with reception when you arrive.</AppText></View>
      </Card>
      <Card style={styles.infoCard}>
        <AppText style={styles.infoTitle}>{t('checkInTitle')}</AppText>
        <AppText style={styles.meta}>{t('checkInDescription')}</AppText>
      </Card>
    </AppScreen>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <View style={styles.metric}><AppText style={styles.metricValue}>{value}</AppText><AppText style={styles.metricLabel}>{label}</AppText></View>;
}

const styles = StyleSheet.create({
  queueCard: { gap: 20 },
  queueHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  liveLabel: { color: colors.success, fontSize: 9, letterSpacing: 1, fontWeight: '800', marginBottom: 8 },
  queueTitle: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  meta: { color: colors.muted, fontSize: 11, lineHeight: 17 },
  queueNumber: { borderRadius: 14, backgroundColor: colors.brandSoft, alignItems: 'center', paddingHorizontal: 11, paddingVertical: 8 },
  queueSmall: { color: colors.brand, fontSize: 8, fontWeight: '700' },
  number: { color: colors.brand, fontSize: 26, fontWeight: '800' },
  metrics: { flexDirection: 'row', borderRadius: 14, backgroundColor: colors.canvas, paddingVertical: 14 },
  metric: { flex: 1, alignItems: 'center', gap: 4 },
  metricValue: { color: colors.text, fontSize: 16, fontWeight: '700' },
  metricLabel: { color: colors.muted, fontSize: 9, textAlign: 'center' },
  progress: { justifyContent: 'space-between', flexDirection: 'row', position: 'relative', paddingTop: 3 },
  progressLine: { position: 'absolute', top: 9, height: 2, left: 10, right: 20, backgroundColor: colors.border },
  progressStep: { width: '25%', gap: 7, alignItems: 'flex-start' },
  progressDot: { width: 13, height: 13, borderRadius: 7, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface },
  progressDone: { backgroundColor: colors.brand, borderColor: colors.brand },
  progressText: { color: colors.muted, fontSize: 8 },
  progressTextDone: { color: colors.brand, fontWeight: '700' },
  notice: { backgroundColor: '#FFF6E5', padding: 11, borderRadius: 11 },
  noticeText: { color: '#805F22', fontSize: 10, lineHeight: 16 },
  infoCard: { gap: 6 },
  infoTitle: { color: colors.text, fontSize: 14, fontWeight: '700' },
});
