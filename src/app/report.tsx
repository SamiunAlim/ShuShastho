import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ActionButton, AppScreen, AppText, BiText, Card, DemoNotice, KanthaCard, ScreenHeader } from '../components/ui';
import { useJourney } from '../context/JourneyContext';
import { useLanguage } from '../context/LanguageContext';
import colors from '../constants/colors';
import type { TranslationKey } from '../constants/i18n';
import { report, type ReportStatus } from '../services/mock';
import { goBack } from '../utils/navigation';

const STATUS: Record<ReportStatus, { key: TranslationKey; bg: string; fg: string }> = {
  low: { key: 'statusLow', bg: colors.redSoft, fg: colors.danger },
  normal: { key: 'statusNormal', bg: colors.mint2, fg: colors.brand },
  positive: { key: 'statusPositive', bg: colors.redSoft, fg: colors.danger },
};

/** WBC is only slightly under range, so it reads as a softer (yellow) "low". */
const SOFT_LOW = new Set(['wbc']);

export default function ReportScreen() {
  const { language, t, L, nf } = useLanguage();
  const journey = useJourney();
  const [pdfSaved, setPdfSaved] = useState(false);
  const { markReportViewed } = journey;

  useEffect(() => {
    markReportViewed();
  }, [markReportViewed]);

  const [older, latest] = report.plateletHistory;
  const dropPercent = Math.round(((older.value - latest.value) / older.value) * 100);
  const max = Math.max(older.value, latest.value);
  // Indian (lakh) digit grouping: 1,80,000.
  const lakh = (value: number) => nf(value.toLocaleString('en-IN'));

  return (
    <AppScreen
      header={<ScreenHeader title={L('reportTitle')} extra={report.lab} onBack={() => goBack('/(tabs)/records')} />}
      footer={
        <>
          <OutlineButton label={pdfSaved ? t('pdfSaved') : t('savePdf')} icon="download-outline" onPress={() => setPdfSaved(true)} />
          <View style={styles.flex}>
            <ActionButton
              label={journey.reportShared ? t('sharedWithDoctor') : t('shareWithDoctor')}
              onPress={journey.shareReport}
              disabled={journey.reportShared}
            />
          </View>
        </>
      }
    >
      <DemoNotice compact />

      <KanthaCard style={styles.summary}>
        <View style={styles.summaryHead}>
          <MaterialCommunityIcons name="creation" size={16} color={colors.brand} />
          <AppText style={styles.summaryLabel}>
            {t('aiSummary')}{language === 'bn' ? ' · AI summary' : ''}
          </AppText>
        </View>
        <BiText text={L('reportSummary')} style={styles.summaryMain} subStyle={styles.summarySub} />
        <BiText text={L('notSubstitute')} hideSub style={styles.disclaimer} />
      </KanthaCard>

      <Card style={styles.table}>
        <View style={styles.tableRow}>
          {(['colTest', 'colResult', 'colNormal', 'colStatus'] as const).map((key, index) => (
            <AppText key={key} style={[styles.th, COLS[index]]}>{t(key)}</AppText>
          ))}
        </View>
        {report.rows.map((row) => {
          const status = STATUS[row.status];
          const soft = SOFT_LOW.has(row.id);
          const bg = soft ? colors.yellow : status.bg;
          const fg = soft ? colors.yellowText : status.fg;
          return (
            <View key={row.id} style={[styles.tableRow, styles.bodyRow]}>
              <AppText style={[styles.testName, COLS[0]]}>{row.test[language]}</AppText>
              <AppText style={[styles.cell, COLS[1]]}>
                {row.resultText ? row.resultText[language] : nf(row.result.toLocaleString('en-IN'))}
              </AppText>
              <AppText style={[styles.cell, styles.normal, COLS[2]]}>{row.normal[language]}</AppText>
              <View style={COLS[3]}>
                <View style={[styles.statusPill, { backgroundColor: bg }]}>
                  <AppText style={[styles.statusText, { color: fg }]}>{t(status.key)}</AppText>
                </View>
              </View>
            </View>
          );
        })}
      </Card>

      <Card style={styles.compare}>
        <BiText text={L('compareTitle')} style={styles.compareTitle} />
        {[older, latest].map((point, index) => {
          const isLatest = index === 1;
          return (
            <View key={point.label.en} style={styles.barRow}>
              <AppText style={styles.barLabel}>{point.label[language]}</AppText>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    { width: `${(point.value / max) * 100}%`, backgroundColor: isLatest ? colors.danger : colors.green2 },
                  ]}
                />
              </View>
              <AppText style={[styles.barValue, { color: isLatest ? colors.danger : colors.brand }]}>{lakh(point.value)}</AppText>
            </View>
          );
        })}
        <View style={styles.alert}>
          <Ionicons name="warning-outline" size={20} color={colors.danger} />
          <View style={styles.flex}>
            <BiText text={L('plateletDrop', { p: dropPercent })} style={styles.alertText} subStyle={styles.alertSub} />
          </View>
        </View>
      </Card>
    </AppScreen>
  );
}

// Column widths for the results table (flex ratios).
const COLS = [{ flex: 1.15 }, { flex: 1 }, { flex: 1.2 }, { flex: 0.9 }] as const;

function OutlineButton({ label, icon, onPress }: { label: string; icon: React.ComponentProps<typeof Ionicons>['name']; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.outline, pressed && { opacity: 0.8 }]}>
      <Ionicons name={icon} size={18} color={colors.brand} />
      <AppText style={styles.outlineText}>{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  summary: { gap: 8 },
  summaryHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  summaryLabel: { color: colors.brand, fontSize: 13, fontWeight: '700' },
  summaryMain: { color: colors.text, fontSize: 15, lineHeight: 24, fontWeight: '600' },
  summarySub: { fontSize: 12, lineHeight: 18 },
  disclaimer: { color: colors.muted, fontSize: 11, lineHeight: 17 },
  table: { padding: 0, overflow: 'hidden' },
  tableRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10 },
  bodyRow: { borderTopWidth: 1, borderTopColor: colors.border },
  th: { color: colors.muted, fontSize: 11 },
  testName: { color: colors.text, fontSize: 13, fontWeight: '700' },
  cell: { color: colors.text, fontSize: 12 },
  normal: { color: colors.muted, fontSize: 11 },
  statusPill: { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },
  compare: { gap: 12 },
  compareTitle: { color: colors.text, fontSize: 15, lineHeight: 23, fontWeight: '700' },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel: { width: 78, color: colors.text, fontSize: 12 },
  barTrack: { flex: 1, height: 12, borderRadius: 6, backgroundColor: colors.grey, overflow: 'hidden' },
  barFill: { height: 12, borderRadius: 6 },
  barValue: { width: 64, textAlign: 'right', fontSize: 13, fontWeight: '700' },
  alert: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.redSoft, borderRadius: 12, padding: 12 },
  alertText: { color: colors.danger, fontSize: 13, lineHeight: 20, fontWeight: '600' },
  alertSub: { color: colors.danger, opacity: 0.8 },
  outline: {
    minHeight: 48, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1.5, borderColor: colors.brand,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  outlineText: { color: colors.brand, fontSize: 15, fontWeight: '700' },
});
