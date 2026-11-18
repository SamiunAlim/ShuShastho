import { Ionicons } from '@expo/vector-icons';
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
        <View style={styles.avatar}><AppText style={styles.avatarText}>{t('patientInitials')}</AppText></View>
        <View style={styles.flex}>
          <AppText style={styles.name}>{t('patientName')}</AppText>
          <AppText style={styles.meta}>{t('patientPhone')}</AppText>
        </View>
        <Ionicons name="checkmark-circle" size={22} color={colors.success} />
      </Card>
      <Card style={styles.settings}>
        <SettingRow label={t('personalInformation')} detail={t('contactDetails')} />
        <SettingRow label={t('medicalId')} detail={t('medicalDetails')} />
        <SettingRow label={t('familyMembers')} detail={t('familyAccess')} />
        <Pressable accessibilityRole="button" onPress={toggleLanguage} style={[styles.settingRow, styles.divider]}>
          <View style={styles.flex}>
            <AppText style={styles.settingLabel}>{t('languageLabel')}</AppText>
            <AppText style={styles.meta}>{language === 'en' ? 'English' : 'বাংলা'}</AppText>
          </View>
          <View style={styles.switchRow}>
            <AppText style={styles.chevron}>{t('language')}</AppText>
            <Ionicons name="chevron-forward" size={16} color={colors.brand} />
          </View>
        </Pressable>
        <SettingRow label={t('privacyConsent')} detail={t('manageDataAccess')} last />
      </Card>
      <AppText style={styles.version}>{t('appVersion')}</AppText>
    </AppScreen>
  );
}

function SettingRow({ label, detail, last = false }: { label: string; detail: string; last?: boolean }) {
  return (
    <View style={[styles.settingRow, !last && styles.divider]}>
      <View style={styles.flex}>
        <AppText style={styles.settingLabel}>{label}</AppText>
        <AppText style={styles.meta}>{detail}</AppText>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.brand} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 52, height: 52, borderRadius: 18, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.brand, fontSize: 18, fontWeight: '700' },
  name: { color: colors.text, fontSize: 17, lineHeight: 25, fontWeight: '700' },
  meta: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  settings: { paddingHorizontal: 14, paddingVertical: 0 },
  settingRow: { minHeight: 66, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  settingLabel: { color: colors.text, fontSize: 14, lineHeight: 22, fontWeight: '600' },
  chevron: { color: colors.brand, fontSize: 13, fontWeight: '600' },
  version: { color: colors.muted, textAlign: 'center', fontSize: 11 },
});
