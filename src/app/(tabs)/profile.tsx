import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ProfileView } from '../../components/ProfileView';
import { AppScreen, AppText, BrandHeader, Card, DemoNotice, PageTitle } from '../../components/ui';
import colors from '../../constants/colors';
import { useLanguage } from '../../context/LanguageContext';

/** Patient Profile tab: the shared profile view plus the language switch. */
export default function ProfileScreen() {
  const { language, t, toggleLanguage } = useLanguage();
  return (
    <AppScreen>
      <BrandHeader />
      <DemoNotice compact />
      <PageTitle title={t('myProfile')} subtitle={t('profileSubtitle')} />
      <ProfileView>
        <Card style={styles.settings}>
          <Pressable accessibilityRole="button" onPress={toggleLanguage} style={styles.settingRow}>
            <View style={styles.flex}>
              <AppText style={styles.settingLabel}>{t('languageLabel')}</AppText>
              <AppText style={styles.meta}>{language === 'en' ? 'English' : 'বাংলা'}</AppText>
            </View>
            <View style={styles.switchRow}>
              <AppText style={styles.chevron}>{t('language')}</AppText>
              <Ionicons name="chevron-forward" size={16} color={colors.brand} />
            </View>
          </Pressable>
        </Card>
      </ProfileView>
      <AppText style={styles.version}>{t('appVersion')}</AppText>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  meta: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  settings: { paddingHorizontal: 14, paddingVertical: 0 },
  settingRow: { minHeight: 66, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  settingLabel: { color: colors.text, fontSize: 14, lineHeight: 22, fontWeight: '600' },
  chevron: { color: colors.brand, fontSize: 13, fontWeight: '600' },
  version: { color: colors.muted, textAlign: 'center', fontSize: 11 },
});
