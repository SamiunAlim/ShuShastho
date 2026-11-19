import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { CHRONIC } from '../../components/ProfileForm';
import { ActionButton, AppScreen, AppText, BiText, BrandHeader, Card, DemoNotice, PageTitle } from '../../components/ui';
import colors from '../../constants/colors';
import type { TranslationKey } from '../../constants/i18n';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

const GENDER_LABEL: Record<string, TranslationKey> = { male: 'pfMale', female: 'pfFemale', other: 'pfOther' };

function initialsOf(name: string): string {
  const letters = name.trim().split(/\s+/).slice(0, 2).map((word) => Array.from(word)[0] ?? '');
  return letters.join('');
}

export default function ProfileScreen() {
  const { language, t, tf, nf, toggleLanguage, L } = useLanguage();
  const { signOut, profile, session } = useAuth();
  const none = t('pfNotAdded');

  const address = [profile?.area, profile?.district].filter(Boolean).join(', ');
  const ageGender = [
    profile?.age ? tf('pfYears', { n: profile.age }) : '',
    profile?.gender ? t(GENDER_LABEL[profile.gender]) : '',
  ].filter(Boolean).join(' · ');
  const chronic = (profile?.chronic ?? [])
    .map((key) => CHRONIC.find((c) => c.key === key))
    .filter((c): c is (typeof CHRONIC)[number] => Boolean(c))
    .map((c) => t(c.label))
    .join(', ');

  return (
    <AppScreen>
      <BrandHeader />
      <DemoNotice compact />
      <PageTitle title={t('personalInformation')} subtitle={t('profileSubtitle')} />
      <Card style={styles.profileCard}>
        <View style={styles.avatar}><AppText style={styles.avatarText}>{initialsOf(profile?.name ?? '')}</AppText></View>
        <View style={styles.flex}>
          <AppText style={styles.name}>{profile?.name}</AppText>
          <AppText style={styles.meta}>+{nf(880)}{nf(session?.phone ?? '')}</AppText>
        </View>
        <Pressable accessibilityRole="button" onPress={() => router.push('/edit-profile')} style={styles.editButton}>
          <Ionicons name="create-outline" size={16} color={colors.brand} />
          <AppText style={styles.editText}>{t('pfEdit')}</AppText>
        </Pressable>
      </Card>

      <Card style={styles.infoCard}>
        <BiText text={L('personalInformation')} style={styles.sectionTitle} />
        <InfoRow label={`${t('pfAge')} · ${t('pfGender')}`} value={nf(ageGender) || none} />
        <InfoRow label={t('pfAddress')} value={address || none} />
      </Card>

      <Card style={styles.infoCard}>
        <BiText text={L('medicalId')} style={styles.sectionTitle} />
        <InfoRow label={t('pfBloodGroup')} value={profile?.bloodGroup || none} />
        <InfoRow label={t('pfAllergies')} value={profile?.allergies || t('pfNone')} />
        <InfoRow label={t('pfChronic')} value={chronic || t('pfNone')} />
        <InfoRow label={t('pfEmergencyContact')} value={profile?.emergencyContact ? nf(profile.emergencyContact) : none} last />
      </Card>

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
      <ActionButton label={t('logOut')} onPress={signOut} variant="secondary" />
      <AppText style={styles.version}>{t('appVersion')}</AppText>
    </AppScreen>
  );
}

function InfoRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.infoRow, !last && styles.divider]}>
      <AppText style={styles.meta}>{label}</AppText>
      <AppText style={styles.infoValue}>{value}</AppText>
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
  editButton: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 12, borderWidth: 1, borderColor: colors.brand, paddingHorizontal: 12, paddingVertical: 8 },
  editText: { color: colors.brand, fontSize: 13, fontWeight: '700' },
  infoCard: { gap: 6 },
  sectionTitle: { color: colors.text, fontSize: 15, lineHeight: 23, fontWeight: '700', marginBottom: 4 },
  infoRow: { gap: 2, paddingVertical: 8 },
  infoValue: { color: colors.text, fontSize: 14, lineHeight: 21, fontWeight: '600' },
  settings: { paddingHorizontal: 14, paddingVertical: 0 },
  settingRow: { minHeight: 66, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  settingLabel: { color: colors.text, fontSize: 14, lineHeight: 22, fontWeight: '600' },
  chevron: { color: colors.brand, fontSize: 13, fontWeight: '600' },
  version: { color: colors.muted, textAlign: 'center', fontSize: 11 },
});
