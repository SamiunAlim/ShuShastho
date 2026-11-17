import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppScreen, AppText, BrandHeader, Card, DemoNotice, PageTitle } from '../../components/ui';
import { useLanguage } from '../../context/LanguageContext';
import colors from '../../constants/colors';

export default function ProfileScreen() {
  const { language, t, toggleLanguage } = useLanguage();
  return (
    <AppScreen>
      <BrandHeader />
      <DemoNotice compact />
      <PageTitle title={t('patientName')} subtitle={t('profileSubtitle')} />
      <Card style={styles.profileCard}>
        <View style={styles.avatar}><AppText style={styles.avatarText}>RA</AppText></View>
        <View style={{ flex: 1 }}>
          <AppText style={styles.name}>{t('patientName')}</AppText>
          <AppText style={styles.meta}>+880 17•• ••• 248</AppText>
        </View>
        <AppText style={styles.verified}>✓</AppText>
      </Card>
      <Card style={styles.settings}>
        <SettingRow label={t('personalInformation')} detail={t('contactDetails')} />
        <SettingRow label={t('medicalId')} detail={t('medicalDetails')} />
        <SettingRow label={t('familyMembers')} detail={t('familyAccess')} />
        <Pressable accessibilityRole="button" onPress={toggleLanguage} style={styles.settingRow}>
          <View><AppText style={styles.settingLabel}>Language</AppText><AppText style={styles.meta}>{language === 'en' ? 'English' : 'বাংলা'}</AppText></View>
          <AppText style={styles.chevron}>{t('language')}  ›</AppText>
        </Pressable>
        <SettingRow label={t('privacyConsent')} detail={t('manageDataAccess')} last />
      </Card>
      <AppText style={styles.version}>ShuShastho · Patient preview</AppText>
    </AppScreen>
  );
}

function SettingRow({ label, detail, last = false }: { label: string; detail: string; last?: boolean }) {
  return (
    <View style={[styles.settingRow, !last && styles.divider]}>
      <View><AppText style={styles.settingLabel}>{label}</AppText><AppText style={styles.meta}>{detail}</AppText></View>
      <AppText style={styles.chevron}>›</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 52, height: 52, borderRadius: 18, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.brand, fontSize: 17, fontWeight: '800' },
  name: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  meta: { color: colors.muted, fontSize: 11, lineHeight: 17 },
  verified: { color: colors.success, fontSize: 18, fontWeight: '800' },
  settings: { paddingHorizontal: 14, paddingVertical: 0 },
  settingRow: { minHeight: 66, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  settingLabel: { color: colors.text, fontSize: 13, fontWeight: '600', marginBottom: 3 },
  chevron: { color: colors.brand, fontSize: 12, fontWeight: '700' },
  version: { color: colors.muted, textAlign: 'center', fontSize: 10 },
});
