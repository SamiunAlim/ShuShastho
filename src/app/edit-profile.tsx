import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { BasicFields, DetailFields, toDraft, toProfile, validateBasic, validateDetails, type Draft, type Errors } from '../components/ProfileFields';
import { ActionButton, AppScreen, AppText, BiText, ScreenHeader } from '../components/ui';
import colors from '../constants/colors';
import { ROLE_META } from '../constants/roles';
import { EMPTY_PROFILE, useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { goBack } from '../utils/navigation';

/** Edit profile (every role): the same fields as sign-up, minus the password. The phone number and role stay fixed. */
export default function EditProfileScreen() {
  const { t, L } = useLanguage();
  const { profile, updateProfile } = useAuth();
  const [draft, setDraft] = useState<Draft>(toDraft({ ...EMPTY_PROFILE, ...profile }));
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);

  const patch = (changes: Partial<Draft>) => {
    setDraft((current) => ({ ...current, ...changes }));
    setErrors((current) => {
      const next = { ...current };
      (Object.keys(changes) as (keyof Draft)[]).forEach((key) => delete next[key]);
      return next;
    });
  };

  const save = async () => {
    const found = { ...validateBasic(draft, t, false), ...validateDetails(draft, t) };
    if (Object.keys(found).length > 0) return setErrors(found);
    setSaving(true);
    await updateProfile(toProfile(draft));
    goBack('/');
  };

  return (
    <AppScreen
      header={<ScreenHeader title={L('editProfileTitle')} onBack={() => goBack('/')} />}
      contentStyle={styles.content}
      footer={<View style={styles.flex}><ActionButton label={saving ? '…' : t('pfSaveChanges')} onPress={save} disabled={saving} /></View>}
    >
      <BiText text={L('editProfileSubtitle')} style={styles.subtitle} />
      <AppText style={styles.roleTag}>{t(ROLE_META[draft.role].label)}</AppText>
      <BasicFields draft={draft} patch={patch} errors={errors} creating={false} />
      <DetailFields draft={draft} patch={patch} errors={errors} />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, gap: 16 },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  roleTag: { alignSelf: 'flex-start', color: colors.brand, backgroundColor: colors.mint2, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, fontSize: 12, fontWeight: '700' },
});
