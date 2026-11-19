import React from 'react';
import { StyleSheet, View } from 'react-native';
import { StaffFooter } from '../../components/StaffFooter';
import { AppScreen, AppText, BiText, Card, ScreenHeader } from '../../components/ui';
import colors from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import { useDesk } from '../../context/DeskContext';
import { useLanguage } from '../../context/LanguageContext';
import { EmergencyAlerts } from '../../components/EmergencyAlerts';
import { useDoctors, useQueuePoll } from '../../hooks/usePolling';
import { DEMO } from '../../services/mock';
import { formatTaka } from '../../utils/format';

/** Hospital admin dashboard (web). Queue numbers are live from the front-desk / doctor state. */
export default function HospitalAdminScreen() {
  const { t, L, nf, language } = useLanguage();
  const { session } = useAuth();
  const desk = useDesk();
  const doctors = useDoctors();
  useQueuePoll();

  const seen = desk.patients.filter((p) => p.status === 'done').length;
  const walkIns = desk.patients.filter((p) => p.walkIn).length;
  // Revenue: money already received online (demo) vs. cash still to collect at the desk.
  const active = desk.patients.filter((p) => p.status !== 'noShow');
  const onlinePaid = active.filter((p) => p.payment.status === 'paid').reduce((sum, p) => sum + p.payment.amount, 0);
  const cashDue = active.filter((p) => p.payment.status !== 'paid' && p.status !== 'done').reduce((sum, p) => sum + p.payment.amount, 0);

  return (
    <AppScreen
      header={<ScreenHeader title={L('destHospitalAdmin')} extra={[DEMO.hospital[language], session?.name[language]].filter(Boolean).join(' · ')} />}
      contentStyle={styles.content}
      footer={<StaffFooter />}
    >
      <EmergencyAlerts />

      <View style={styles.grid}>
        <Kpi label={t('haPatientsToday')} value={nf(desk.patients.length)} bg={colors.mint2} fg={colors.brand} />
        <Kpi label={t('areaWaiting')} value={nf(desk.counts.waiting)} bg={colors.blue} fg={colors.blueText} />
        <Kpi label={t('areaSeen')} value={nf(seen)} bg={colors.mint2} fg={colors.brand} />
        <Kpi label={t('fdNoShow')} value={nf(desk.counts.noShow)} bg={colors.redSoft} fg={colors.danger} />
        <Kpi label={t('fdWalkInTag')} value={nf(walkIns)} bg={colors.pink} fg={colors.pinkText} />
        <Kpi label={t('haWaitMinutes')} value={nf(desk.counts.waiting * DEMO.minutesPerPatient)} bg={colors.yellow} fg={colors.yellowText} />
        <Kpi label={t('haFees')} value={nf(formatTaka(seen * DEMO.fee))} bg={colors.mint2} fg={colors.brand} />
        <Kpi label={t('haOnlinePaid')} value={nf(formatTaka(onlinePaid))} bg={colors.mint3} fg={colors.brand} />
        <Kpi label={t('haCashDue')} value={nf(formatTaka(cashDue))} bg={colors.yellow} fg={colors.yellowText} />
      </View>
      <AppText style={styles.note}>{t('haLiveNote')}</AppText>

      <BiText text={L('haDoctors')} style={styles.heading} />
      <Card style={styles.table}>
        <View style={[styles.row, styles.head]}>
          <AppText style={[styles.cell, styles.cellWide, styles.headText]}>{t('haDoctors')}</AppText>
          <AppText style={[styles.cell, styles.headText]}>{t('haSlotsLeft')}</AppText>
          <AppText style={[styles.cell, styles.headText]}>{t('haFee')}</AppText>
        </View>
        {doctors.map((doctor) => (
          <View key={doctor.id} style={[styles.row, styles.divider]}>
            <View style={[styles.cell, styles.cellWide]}>
              <AppText style={styles.name}>{doctor.name[language]}</AppText>
              <AppText style={styles.meta}>{doctor.specialty[language]}</AppText>
            </View>
            <AppText style={styles.cell}>{nf(doctor.slots)}</AppText>
            <AppText style={styles.cell}>{nf(formatTaka(doctor.fee))}</AppText>
          </View>
        ))}
      </Card>
    </AppScreen>
  );
}

function Kpi({ label, value, bg, fg }: { label: string; value: string; bg: string; fg: string }) {
  return (
    <View style={[styles.kpi, { backgroundColor: bg }]}>
      <AppText style={[styles.kpiValue, { color: fg }]}>{value}</AppText>
      <AppText style={styles.kpiLabel}>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 16, gap: 14, width: '100%', maxWidth: 960, alignSelf: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpi: { flexGrow: 1, flexBasis: 150, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 14, gap: 2 },
  kpiValue: { fontSize: 28, lineHeight: 38, fontWeight: '700' },
  kpiLabel: { color: colors.muted, fontSize: 12 },
  note: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  heading: { color: colors.text, fontSize: 16, lineHeight: 24, fontWeight: '700' },
  table: { paddingVertical: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 52 },
  head: { minHeight: 36 },
  headText: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  cell: { flex: 1, color: colors.text, fontSize: 13 },
  cellWide: { flex: 2.2 },
  name: { color: colors.text, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  meta: { color: colors.muted, fontSize: 12, lineHeight: 18 },
});
