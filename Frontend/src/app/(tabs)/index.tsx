import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppScreen, AppText, BiText, Card, DemoNotice, KanthaCard, ScreenHeader, SectionTitle } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useQueue } from '../../context/QueueContext';
import colors from '../../constants/colors';
import { DEMO, findDoctor, type Localized } from '../../services/mock';
import { WEEKDAYS } from '../../utils/format';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export default function HomeScreen() {
  const { language, t, tf, nf, L } = useLanguage();
  const { signOut } = useAuth();
  const queue = useQueue();
  const doctor = findDoctor(queue.doctorId);
  const weekday = WEEKDAYS[language][new Date().getDay()];

  return (
    <AppScreen
      header={
        <ScreenHeader brand onBack={() => {
          signOut();
          router.replace('/login');
        }}>
          <View style={styles.greeting}>
            <AppText style={styles.eyebrow}>{weekday} · {t('dhaka')}</AppText>
            <BiText text={L('greeting')} style={styles.greetingTitle} />
            <BiText text={L('greetingSubtitle')} style={styles.subtitle} />
          </View>
        </ScreenHeader>
      }
    >
      <DemoNotice compact />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('assistantAction')}
        onPress={() => router.push('/assistant')}
        style={({ pressed }) => [styles.assistantCard, pressed && styles.pressed]}
      >
        <View style={styles.assistantIcon}><Ionicons name="sparkles" size={22} color="#D7F2E6" /></View>
        <View style={styles.assistantCopy}>
          <AppText style={styles.assistantEyebrow}>{t('aiBrand')}</AppText>
          <BiText text={L('assistantTitle')} style={styles.assistantTitle} subStyle={styles.assistantSub} />
          <BiText text={L('assistantDescription')} style={styles.assistantSubtitle} subStyle={styles.assistantSub} />
        </View>
        <Ionicons name="chevron-forward" size={24} color={colors.surface} />
      </Pressable>

      <View style={styles.section}>
        <SectionTitle text={L('appointment')} action={t('preview')} />
        <KanthaCard style={styles.appointmentCard}>
          <View style={styles.appointmentTop}>
            <View style={styles.flex}>
              <AppText style={styles.doctorName}>{doctor.name[language]}</AppText>
              <AppText style={styles.meta}>{DEMO.hospital[language]}</AppText>
              <AppText style={styles.meta}>{DEMO.visitTime[language]}</AppText>
            </View>
            <View style={styles.serialBadge}>
              <AppText style={styles.serialLabel}>{t('yourSerial')}</AppText>
              <AppText style={styles.serialNumber}>#{nf(queue.serial)}</AppText>
            </View>
          </View>
          <View style={styles.appointmentFooter}>
            <View style={styles.statusRow}>
              <Ionicons name="ellipse" size={8} color={colors.success} />
              <AppText style={styles.waitingText}>
                {queue.isMyTurn ? t('yourTurn') : tf('peopleAhead', { n: queue.ahead })}
              </AppText>
            </View>
            <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/serials')} style={styles.statusRow}>
              <AppText style={styles.linkText}>{t('seeQueue')}</AppText>
              <Ionicons name="chevron-forward" size={14} color={colors.brand} />
            </Pressable>
          </View>
        </KanthaCard>
      </View>

      <View style={styles.section}>
        <SectionTitle text={L('quickActions')} />
        <View style={styles.quickGrid}>
          <QuickAction icon="medkit-outline" label={L('doctors')} color={colors.mint2} onPress={() => router.push('/(tabs)/doctors')} />
          <QuickAction icon="medical-outline" label={L('medicine')} color={colors.yellow} onPress={() => router.push('/prescription')} />
          <QuickAction icon="document-text-outline" label={L('reports')} color={colors.blue} onPress={() => router.push('/report')} />
          <QuickAction icon="people-outline" label={L('family')} color={colors.pink} onPress={() => router.push('/(tabs)/profile')} />
        </View>
      </View>

      <Card style={styles.reminderCard}>
        <View style={styles.reminderIcon}><Ionicons name="alarm-outline" size={22} color={colors.yellowText} /></View>
        <View style={styles.flex}>
          <BiText text={L('reminder')} style={styles.reminderTitle} />
          <AppText style={styles.meta}>{t('reminderMeta')}</AppText>
        </View>
        <AppText style={styles.reminderTime}>{t('reminderTime')}</AppText>
      </Card>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/emergency')}
        style={({ pressed }) => [styles.sosCard, pressed && styles.pressed]}
      >
        <View style={styles.sosIcon}><Ionicons name="warning" size={22} color={colors.surface} /></View>
        <View style={styles.flex}>
          <BiText text={L('sos')} style={styles.sosTitle} />
          <BiText text={L('sosMeta')} style={styles.sosSubtitle} />
        </View>
        <Ionicons name="chevron-forward" size={22} color={colors.danger} />
      </Pressable>
    </AppScreen>
  );
}

function QuickAction({ icon, label, color, onPress }: {
  icon: IconName;
  label: Localized;
  color: string;
  onPress: () => void;
}) {
  const { language } = useLanguage();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label[language]}
      onPress={onPress}
      style={({ pressed }) => [styles.quickAction, pressed && styles.pressed]}
    >
      <View style={[styles.quickIcon, { backgroundColor: color }]}><Ionicons name={icon} size={22} color={colors.brand} /></View>
      <BiText text={label} style={styles.quickLabel} subStyle={styles.quickSub} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  greeting: { gap: 4, paddingTop: 2 },
  eyebrow: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  greetingTitle: { color: colors.text, fontSize: 26, lineHeight: 36, fontWeight: '700' },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 22 },
  assistantCard: {
    minHeight: 138, padding: 18, borderRadius: 16, backgroundColor: colors.brand,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  assistantIcon: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center', justifyContent: 'center',
  },
  assistantCopy: { flex: 1, gap: 4 },
  assistantEyebrow: { color: '#C6E8D9', fontSize: 10, fontWeight: '700', letterSpacing: 1.2 },
  assistantTitle: { color: colors.surface, fontSize: 18, lineHeight: 26, fontWeight: '700' },
  assistantSubtitle: { color: '#D7EEE4', fontSize: 13, lineHeight: 20 },
  assistantSub: { color: '#B5D9C9' },
  pressed: { opacity: 0.83 },
  section: { gap: 12 },
  appointmentCard: { gap: 14 },
  appointmentTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  doctorName: { color: colors.text, fontSize: 16, lineHeight: 24, fontWeight: '700' },
  meta: { color: colors.muted, fontSize: 12, lineHeight: 19 },
  serialBadge: { backgroundColor: colors.brandSoft, borderRadius: 12, paddingVertical: 7, paddingHorizontal: 12, alignItems: 'center' },
  serialLabel: { color: colors.brand, fontSize: 10, fontWeight: '700' },
  serialNumber: { color: colors.brand, fontSize: 24, lineHeight: 32, fontWeight: '700' },
  appointmentFooter: { paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  waitingText: { color: colors.success, fontSize: 13, fontWeight: '600' },
  linkText: { color: colors.brand, fontSize: 13, fontWeight: '600' },
  quickGrid: { flexDirection: 'row', gap: 10 },
  quickAction: { flex: 1, backgroundColor: colors.surface, borderRadius: 16, paddingVertical: 14, alignItems: 'center', gap: 8, borderColor: colors.border, borderWidth: 1 },
  quickIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { color: colors.text, fontSize: 12, fontWeight: '500', textAlign: 'center' },
  quickSub: { textAlign: 'center', fontSize: 10 },
  reminderCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  reminderIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.yellow, alignItems: 'center', justifyContent: 'center' },
  reminderTitle: { color: colors.text, fontSize: 14, lineHeight: 22, fontWeight: '700' },
  reminderTime: { color: colors.muted, fontSize: 11, fontWeight: '500' },
  sosCard: { borderRadius: 16, padding: 15, backgroundColor: colors.redSoft, flexDirection: 'row', alignItems: 'center', gap: 12 },
  sosIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
  sosTitle: { color: '#A73D47', fontSize: 14, lineHeight: 22, fontWeight: '700' },
  sosSubtitle: { color: '#98656B', fontSize: 12, lineHeight: 18 },
});
