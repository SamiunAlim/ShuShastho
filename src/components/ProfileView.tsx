import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import colors from '../constants/colors';
import type { TranslationKey } from '../constants/i18n';
import { ROLE_META } from '../constants/roles';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { findDepartment, findHospital } from '../services/mock';
import { formatTaka } from '../utils/format';
import { CHRONIC } from './ProfileFields';
import { ActionButton, AppText, BiText, Card } from './ui';

const GENDER_LABEL: Record<string, TranslationKey> = { male: 'pfMale', female: 'pfFemale', other: 'pfOther' };

function initialsOf(name: string): string {
  return name.trim().split(/\s+/).filter((word) => !/^(dr\.?|ডা\.?)$/i.test(word)).slice(0, 2).map((word) => Array.from(word)[0] ?? '').join('');
}

/**
 * Everything the user entered at sign-up, for any role, with Edit, Change password and Log out.
 * `children` adds extra cards (the patient tab puts the language switch there).
 */
export function ProfileView({ children }: { children?: React.ReactNode }) {
  const { language, t, tf, nf, L } = useLanguage();
  const { profile, session, signOut } = useAuth();
  const none = t('pfNotAdded');

  if (!profile) {
    // The demo super-admin has no account: name and Log out only.
    return (
      <>
        <Card style={styles.headCard}>
          <View style={styles.avatar}><AppText style={styles.avatarText}>{initialsOf(session?.name[language] ?? '')}</AppText></View>
          <View style={styles.flex}><AppText style={styles.name}>{session?.name[language]}</AppText></View>
        </Card>
        {children}
        <ActionButton label={t('logOut')} onPress={signOut} variant="secondary" />
      </>
    );
  }

  const department = findDepartment(profile.departmentId)?.name[language];
  const hospital = profile.hospitalId ? findHospital(profile.hospitalId).name[language] : '';
  const address = [profile.area, profile.district].filter(Boolean).join(', ');
  const ageGender = [
    profile.age ? tf('pfYears', { n: profile.age }) : '',
    profile.gender ? t(GENDER_LABEL[profile.gender]) : '',
  ].filter(Boolean).join(' · ');
  const chronic = profile.chronic
    .map((key) => CHRONIC.find((c) => c.key === key))
    .filter((c): c is (typeof CHRONIC)[number] => Boolean(c))
    .map((c) => t(c.label))
    .join(', ');

  let roleTitle: TranslationKey = 'pfWork';
  let roleRows: { label: string; value: string }[] = [];
  switch (profile.role) {
    case 'patient':
      roleTitle = 'medicalId';
      roleRows = [
        { label: t('pfBloodGroup'), value: profile.bloodGroup },
        { label: t('pfAllergies'), value: profile.allergies || t('pfNone') },
        { label: t('pfChronic'), value: chronic || t('pfNone') },
        { label: t('pfEmergencyContact'), value: profile.emergencyContact ? nf(profile.emergencyContact) : '' },
      ];
      break;
    case 'doctor':
      roleTitle = 'pfProfessional';
      roleRows = [
        { label: t('pfBmdc'), value: profile.bmdc },
        { label: t('pfDepartment'), value: department ?? '' },
        { label: t('suHospital'), value: hospital },
        { label: t('pfDegrees'), value: profile.degrees },
        { label: t('pfFee'), value: profile.fee ? nf(formatTaka(Number(profile.fee))) : '' },
      ];
      break;
    case 'receptionist':
    case 'pharmacist':
      roleRows = [
        { label: t('suOrganization'), value: profile.organization },
        { label: t('suStaffId'), value: profile.staffId },
      ];
      break;
    case 'hospitalAdmin':
      roleRows = [
        { label: t('suHospitalName'), value: profile.organization },
        { label: t('suDesignation'), value: profile.designation },
      ];
      break;
    default:
      break;
  }

  return (
    <>
      <Card style={styles.headCard}>
        <View style={styles.avatar}><AppText style={styles.avatarText}>{initialsOf(session?.name[language] ?? profile.name)}</AppText></View>
        <View style={styles.flex}>
          <AppText style={styles.name}>{session?.name[language] ?? profile.name}</AppText>
          <AppText style={styles.roleTag}>{t(ROLE_META[profile.role].label)}</AppText>
        </View>
        <Pressable accessibilityRole="button" onPress={() => router.push('/edit-profile')} style={styles.editButton}>
          <Ionicons name="create-outline" size={16} color={colors.brand} />
          <AppText style={styles.editText}>{t('pfEdit')}</AppText>
        </Pressable>
      </Card>

      <Card style={styles.infoCard}>
        <BiText text={L('personalInformation')} style={styles.sectionTitle} />
        <InfoRow label={t('mobileNumber')} value={nf(profile.phone)} />
        <InfoRow label={t('pfEmail')} value={profile.email || none} />
        <InfoRow label={`${t('pfAge')} · ${t('pfGender')}`} value={nf(ageGender) || none} />
        <InfoRow label={t('pfDobShort')} value={profile.dob ? nf(profile.dob) : none} />
        <InfoRow label={t('pfAddress')} value={address || none} last />
      </Card>

      <Card style={styles.infoCard}>
        <BiText text={L(roleTitle)} style={styles.sectionTitle} />
        {roleRows.map((row, index) => (
          <InfoRow key={row.label} label={row.label} value={row.value || none} last={index === roleRows.length - 1} />
        ))}
      </Card>

      {children}

      <ActionButton label={t('changePassword')} onPress={() => router.push('/change-password')} variant="secondary" />
      <ActionButton label={t('logOut')} onPress={signOut} variant="secondary" />
    </>
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
  headCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 52, height: 52, borderRadius: 18, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.brand, fontSize: 18, fontWeight: '700' },
  name: { color: colors.text, fontSize: 17, lineHeight: 25, fontWeight: '700' },
  roleTag: { alignSelf: 'flex-start', color: colors.brand, backgroundColor: colors.mint2, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 2, fontSize: 11, fontWeight: '700' },
  meta: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  editButton: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 12, borderWidth: 1, borderColor: colors.brand, paddingHorizontal: 12, paddingVertical: 8 },
  editText: { color: colors.brand, fontSize: 13, fontWeight: '700' },
  infoCard: { gap: 2 },
  sectionTitle: { color: colors.text, fontSize: 15, lineHeight: 23, fontWeight: '700', marginBottom: 4 },
  infoRow: { gap: 2, paddingVertical: 8 },
  infoValue: { color: colors.text, fontSize: 14, lineHeight: 21, fontWeight: '600' },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.border },
});
