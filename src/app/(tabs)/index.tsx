import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppScreen, AppText, BrandHeader, Card, DemoNotice, SectionTitle } from '../../components/ui';
import { useLanguage } from '../../context/LanguageContext';
import colors from '../../constants/colors';

export default function HomeScreen() {
  const { t } = useLanguage();
  return (
    <AppScreen>
      <BrandHeader />
      <DemoNotice compact />

      <View style={styles.greeting}>
        <AppText style={styles.eyebrow}>{t('homeContext')}</AppText>
        <AppText style={styles.greetingTitle}>{t('greeting')}</AppText>
        <AppText style={styles.subtitle}>{t('greetingSubtitle')}</AppText>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('assistantAction')}
        onPress={() => router.push('/assistant')}
        style={({ pressed }) => [styles.assistantCard, pressed && styles.pressed]}
      >
        <View style={styles.assistantIcon}><AppText style={styles.assistantIconText}>✦</AppText></View>
        <View style={styles.assistantCopy}>
          <AppText style={styles.assistantEyebrow}>SHUSHASTHO AI</AppText>
          <AppText style={styles.assistantTitle}>{t('assistantTitle')}</AppText>
          <AppText style={styles.assistantSubtitle}>{t('assistantDescription')}</AppText>
        </View>
        <AppText style={styles.arrow}>›</AppText>
      </Pressable>

      <View style={styles.section}>
        <SectionTitle title={t('appointment')} action={t('preview')} />
        <Card style={styles.appointmentCard}>
          <View style={styles.appointmentTop}>
            <View>
              <AppText style={styles.doctorName}>Dr. Samira Hossain</AppText>
              <AppText style={styles.meta}>{t('appointmentMeta')}</AppText>
            </View>
            <View style={styles.serialBadge}>
              <AppText style={styles.serialLabel}>{t('serials').toUpperCase()}</AppText>
              <AppText style={styles.serialNumber}>05</AppText>
            </View>
          </View>
          <View style={styles.appointmentFooter}>
            <AppText style={styles.waitingText}>●  {t('waiting')}</AppText>
            <Pressable onPress={() => router.push('/(tabs)/serials')}>
              <AppText style={styles.linkText}>{t('seeQueue')} ›</AppText>
            </Pressable>
          </View>
        </Card>
      </View>

      <View style={styles.section}>
        <SectionTitle title={t('quickActions')} />
        <View style={styles.quickGrid}>
          <QuickAction icon="✚" label={t('doctors')} color="#E5F4ED" onPress={() => router.push('/(tabs)/doctors')} />
          <QuickAction icon="＋" label={t('medicine')} color="#FFF2DE" onPress={() => router.push('/(tabs)/records')} />
          <QuickAction icon="▣" label={t('reports')} color="#E8F0FB" onPress={() => router.push('/(tabs)/records')} />
          <QuickAction icon="♧" label={t('family')} color="#F6EAF1" onPress={() => router.push('/(tabs)/profile')} />
        </View>
      </View>

      <Card style={styles.reminderCard}>
        <View style={styles.reminderIcon}><AppText style={styles.reminderIconText}>◷</AppText></View>
        <View style={{ flex: 1 }}>
          <AppText style={styles.reminderTitle}>{t('reminder')}</AppText>
          <AppText style={styles.meta}>{t('reminderMeta')}</AppText>
        </View>
        <AppText style={styles.reminderTime}>{t('reminderTime')}</AppText>
      </Card>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/emergency')}
        style={({ pressed }) => [styles.sosCard, pressed && styles.pressed]}
      >
        <View style={styles.sosIcon}><AppText style={styles.sosIconText}>!</AppText></View>
        <View style={{ flex: 1 }}>
          <AppText style={styles.sosTitle}>{t('sos')}</AppText>
          <AppText style={styles.sosSubtitle}>{t('sosMeta')}</AppText>
        </View>
        <AppText style={styles.sosArrow}>›</AppText>
      </Pressable>
    </AppScreen>
  );
}

function QuickAction({ icon, label, color, onPress }: {
  icon: string;
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.quickAction, pressed && styles.pressed]}
    >
      <View style={[styles.quickIcon, { backgroundColor: color }]}><AppText style={styles.quickIconText}>{icon}</AppText></View>
      <AppText style={styles.quickLabel}>{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  greeting: { gap: 5, paddingTop: 2 },
  eyebrow: { color: colors.muted, fontSize: 10, letterSpacing: 1.4, fontWeight: '700' },
  greetingTitle: { color: colors.text, fontSize: 25, fontWeight: '700', marginTop: 2 },
  subtitle: { color: colors.muted, fontSize: 14 },
  assistantCard: {
    minHeight: 138, padding: 18, borderRadius: 20, backgroundColor: colors.brand,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  assistantIcon: {
    width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center', justifyContent: 'center',
  },
  assistantIconText: { color: '#D7F2E6', fontSize: 20 },
  assistantCopy: { flex: 1, gap: 5 },
  assistantEyebrow: { color: '#C6E8D9', fontSize: 9, fontWeight: '700', letterSpacing: 1.2 },
  assistantTitle: { color: colors.surface, fontSize: 18, lineHeight: 23, fontWeight: '700' },
  assistantSubtitle: { color: '#D7EEE4', fontSize: 12, lineHeight: 17 },
  arrow: { color: colors.surface, fontSize: 26 },
  pressed: { opacity: 0.83 },
  section: { gap: 12 },
  appointmentCard: { gap: 16 },
  appointmentTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  doctorName: { color: colors.text, fontSize: 15, fontWeight: '700', marginBottom: 5 },
  meta: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  serialBadge: { backgroundColor: colors.brandSoft, borderRadius: 12, paddingVertical: 7, paddingHorizontal: 11, alignItems: 'center' },
  serialLabel: { color: colors.brand, fontSize: 8, fontWeight: '700', letterSpacing: 0.8 },
  serialNumber: { color: colors.brand, fontSize: 21, fontWeight: '800' },
  appointmentFooter: { paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  waitingText: { color: colors.success, fontSize: 12, fontWeight: '600' },
  linkText: { color: colors.brand, fontSize: 12, fontWeight: '700' },
  quickGrid: { flexDirection: 'row', gap: 10 },
  quickAction: { flex: 1, backgroundColor: colors.surface, borderRadius: 16, paddingVertical: 14, alignItems: 'center', gap: 8, borderColor: colors.border, borderWidth: 1 },
  quickIcon: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  quickIconText: { color: colors.brand, fontSize: 21, fontWeight: '700' },
  quickLabel: { color: colors.text, fontSize: 11, fontWeight: '600' },
  reminderCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  reminderIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: '#FFF2DE', alignItems: 'center', justifyContent: 'center' },
  reminderIconText: { color: '#AD7921', fontSize: 22 },
  reminderTitle: { color: colors.text, fontSize: 14, fontWeight: '700', marginBottom: 3 },
  reminderTime: { color: colors.muted, fontSize: 10, fontWeight: '600' },
  sosCard: { borderRadius: 18, padding: 15, backgroundColor: '#FFF0F0', flexDirection: 'row', alignItems: 'center', gap: 12 },
  sosIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
  sosIconText: { color: colors.surface, fontSize: 22, fontWeight: '800' },
  sosTitle: { color: '#A73D47', fontSize: 14, fontWeight: '700', marginBottom: 3 },
  sosSubtitle: { color: '#98656B', fontSize: 11 },
  sosArrow: { color: colors.danger, fontSize: 23 },
});
