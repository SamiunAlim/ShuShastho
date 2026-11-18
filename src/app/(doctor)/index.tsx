import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AiSummary } from '../../components/AiSummary';
import { StaffFooter } from '../../components/StaffFooter';
import { ActionButton, AppScreen, AppText, BiText, Card, KanthaCard, ScreenHeader } from '../../components/ui';
import colors from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import { useDesk } from '../../context/DeskContext';
import { useLanguage } from '../../context/LanguageContext';
import { DEMO } from '../../services/mock';

/** Doctor's "today" screen: who is with the doctor, who is next (with AI pre-visit summary), Call next. */
export default function DoctorQueueScreen() {
  const { t, tf, L, nf, language } = useLanguage();
  const { session } = useAuth();
  const desk = useDesk();

  const waiting = desk.patients.filter((p) => p.status === 'waiting');
  const seen = desk.patients.filter((p) => p.status === 'done').length;
  const focus = desk.serving ?? desk.nextCallable;

  const open = (serial: number) => router.push({ pathname: '/consult', params: { serial: String(serial) } });
  const callNext = () => {
    const called = desk.callNext();
    if (called) open(called.serial);
  };

  return (
    <AppScreen
      header={<ScreenHeader title={L('destDoctor')} extra={[DEMO.hospital[language], session?.name[language]].filter(Boolean).join(' · ')} />}
      contentStyle={styles.content}
      footer={<StaffFooter />}
    >
      <View style={styles.stats}>
        <Stat label={t('areaWaiting')} value={nf(waiting.length)} />
        <Stat label={t('areaSeen')} value={nf(seen)} />
      </View>

      {focus ? (
        <KanthaCard style={styles.focus}>
          <AppText style={styles.eyebrow}>{t(desk.serving ? 'drNowConsulting' : 'drNextUp')}</AppText>
          <View style={styles.focusTop}>
            <View style={styles.serial}><AppText style={styles.serialText}>#{nf(focus.serial)}</AppText></View>
            <View style={styles.flex}>
              <AppText style={styles.name}>{focus.name[language]}</AppText>
              <AppText style={styles.meta}>{tf('csAge', { n: focus.age })}</AppText>
            </View>
          </View>
          <AiSummary summary={focus.summary} />
          {desk.serving
            ? <ActionButton label={t('drOpenConsult')} onPress={() => open(focus.serial)} />
            : <ActionButton label={t('drCallNext')} onPress={callNext} />}
        </KanthaCard>
      ) : (
        <Card style={styles.empty}>
          <Ionicons name="people-outline" size={26} color={colors.muted} />
          <AppText style={styles.meta}>{t('drNoWaiting')}</AppText>
        </Card>
      )}

      <BiText text={L('drWaitingList')} style={styles.heading} />
      <Card style={styles.list}>
        {waiting.length === 0 ? <AppText style={[styles.meta, styles.pad]}>{t('drNoWaiting')}</AppText> : null}
        {waiting.map((patient, index) => (
          <View key={patient.serial} style={[styles.row, index > 0 && styles.divider]}>
            <View style={styles.serial}><AppText style={styles.serialText}>#{nf(patient.serial)}</AppText></View>
            <View style={styles.flex}>
              <AppText style={styles.name}>{patient.name[language]}</AppText>
              <AppText style={styles.meta} numberOfLines={1}>{patient.summary[language]}</AppText>
            </View>
          </View>
        ))}
      </Card>
    </AppScreen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <AppText style={styles.statValue}>{value}</AppText>
      <AppText style={styles.statLabel}>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingTop: 16, gap: 14 },
  stats: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, backgroundColor: colors.mint2, borderRadius: 16, padding: 14, alignItems: 'center' },
  statValue: { color: colors.brand, fontSize: 26, lineHeight: 36, fontWeight: '700' },
  statLabel: { color: colors.muted, fontSize: 12 },
  focus: { gap: 12 },
  eyebrow: { color: colors.green2, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  focusTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  serial: { minWidth: 46, paddingVertical: 4, borderRadius: 10, backgroundColor: colors.mint2, alignItems: 'center' },
  serialText: { color: colors.brand, fontSize: 13, fontWeight: '700' },
  name: { color: colors.text, fontSize: 15, lineHeight: 22, fontWeight: '700' },
  meta: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  empty: { alignItems: 'center', gap: 6, paddingVertical: 22 },
  heading: { color: colors.text, fontSize: 16, lineHeight: 24, fontWeight: '700' },
  list: { paddingVertical: 4 },
  pad: { paddingVertical: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56 },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
});
