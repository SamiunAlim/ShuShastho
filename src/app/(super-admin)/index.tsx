import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { StaffFooter } from '../../components/StaffFooter';
import { AppScreen, AppText, BiText, Card, ScreenHeader } from '../../components/ui';
import colors from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { HOSPITALS, PLATFORM } from '../../services/mock';

/** Super admin dashboard (web): platform totals and hospital approvals. All figures are fictional demo data. */
export default function SuperAdminScreen() {
  const { t, tf, L, nf, language } = useLanguage();
  const { session } = useAuth();
  const [approved, setApproved] = useState<Record<string, boolean>>(
    Object.fromEntries(HOSPITALS.map((h) => [h.id, h.approved])),
  );

  const totalDoctors = HOSPITALS.reduce((sum, h) => sum + h.doctors, 0);

  return (
    <AppScreen
      header={<ScreenHeader title={L('destSuperAdmin')} extra={session?.name[language]} />}
      contentStyle={styles.content}
      footer={<StaffFooter />}
    >
      <View style={styles.grid}>
        <Kpi label={t('saHospitals')} value={nf(HOSPITALS.length)} bg={colors.mint2} fg={colors.brand} />
        <Kpi label={t('saDoctors')} value={nf(totalDoctors)} bg={colors.blue} fg={colors.blueText} />
        <Kpi label={t('saPatients')} value={nf(PLATFORM.patients.toLocaleString('en-US'))} bg={colors.pink} fg={colors.pinkText} />
        <Kpi label={t('saAiChats')} value={nf(PLATFORM.aiChatsToday)} bg={colors.yellow} fg={colors.yellowText} />
      </View>
      <AppText style={styles.note}>{t('saDemoFigures')}</AppText>

      <BiText text={L('saHospitals')} style={styles.heading} />
      <Card style={styles.table}>
        {HOSPITALS.map((hospital, index) => {
          const ok = approved[hospital.id];
          return (
            <View key={hospital.id} style={[styles.row, index > 0 && styles.divider]}>
              <View style={styles.flex}>
                <AppText style={styles.name}>{hospital.name[language]}</AppText>
                <AppText style={styles.meta}>
                  {tf('saDoctorsCount', { n: hospital.doctors })} · {tf('saPatientsToday', { n: hospital.patientsToday })}
                </AppText>
              </View>
              <View style={[styles.chip, { backgroundColor: ok ? colors.mint2 : colors.yellow }]}>
                <AppText style={[styles.chipText, { color: ok ? colors.brand : colors.yellowText }]}>
                  {t(ok ? 'saActive' : 'saPending')}
                </AppText>
              </View>
              {!ok ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setApproved((current) => ({ ...current, [hospital.id]: true }))}
                  style={({ pressed }) => [styles.approve, pressed && styles.pressed]}
                >
                  <AppText style={styles.approveText}>{t('saApprove')}</AppText>
                </Pressable>
              ) : null}
            </View>
          );
        })}
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
  flex: { flex: 1 },
  content: { paddingTop: 16, gap: 14, width: '100%', maxWidth: 960, alignSelf: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpi: { flexGrow: 1, flexBasis: 170, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 14, gap: 2 },
  kpiValue: { fontSize: 28, lineHeight: 38, fontWeight: '700' },
  kpiLabel: { color: colors.muted, fontSize: 12 },
  note: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  heading: { color: colors.text, fontSize: 16, lineHeight: 24, fontWeight: '700' },
  table: { paddingVertical: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 60, paddingVertical: 6 },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  name: { color: colors.text, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  meta: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  chip: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  chipText: { fontSize: 11, fontWeight: '600' },
  approve: { backgroundColor: colors.brand, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  approveText: { color: colors.surface, fontSize: 12, fontWeight: '700' },
  pressed: { opacity: 0.8 },
});
