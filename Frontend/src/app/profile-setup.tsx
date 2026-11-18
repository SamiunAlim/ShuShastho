import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { ActionButton, AppScreen, AppText, BiText, FONT_FAMILIES, ScreenHeader } from '../components/ui';
import colors from '../constants/colors';
import type { TranslationKey } from '../constants/i18n';
import { Profile, useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { toAsciiDigits } from '../utils/format';

const GENDERS: { key: Exclude<Profile['gender'], ''>; label: TranslationKey }[] = [
  { key: 'male', label: 'pfMale' },
  { key: 'female', label: 'pfFemale' },
  { key: 'other', label: 'pfOther' },
];

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

const CHRONIC: { key: string; label: TranslationKey }[] = [
  { key: 'diabetes', label: 'chDiabetes' },
  { key: 'hypertension', label: 'chHypertension' },
  { key: 'asthma', label: 'chAsthma' },
  { key: 'heart', label: 'chHeart' },
  { key: 'kidney', label: 'chKidney' },
];

export default function ProfileSetupScreen() {
  const { t, L, nf } = useLanguage();
  const { saveProfile, signOut } = useAuth();

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<Profile['gender']>('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [allergies, setAllergies] = useState('');
  const [chronic, setChronic] = useState<string[]>([]);
  const [contact, setContact] = useState('');
  const [consent, setConsent] = useState(false);
  const [touched, setTouched] = useState(false);

  const nameOk = name.trim().length > 0;
  const ageNumber = Number(age);
  const ageOk = age === '' || (ageNumber > 0 && ageNumber < 120);

  const submit = () => {
    setTouched(true);
    if (!nameOk || !ageOk || !consent) return;
    saveProfile({ name: name.trim(), age, gender, bloodGroup, emergencyContact: contact, allergies: allergies.trim(), chronic, consent });
  };

  const toggleChronic = (key: string) =>
    setChronic((current) => (current.includes(key) ? current.filter((k) => k !== key) : [...current, key]));

  return (
    <AppScreen
      header={<ScreenHeader title={L('profileSetupTitle')} />}
      contentStyle={styles.content}
      footer={<View style={styles.flex}><ActionButton label={t('pfSave')} onPress={submit} /></View>}
    >
      <BiText text={L('profileSetupSubtitle')} style={styles.subtitle} />

      <View style={styles.block}>
        <BiText text={L('pfFullName')} style={styles.label} />
        <TextInput
          accessibilityLabel={t('pfFullName')}
          value={name}
          onChangeText={setName}
          style={[styles.input, touched && !nameOk && styles.inputError]}
        />
        {touched && !nameOk ? <AppText style={styles.error}>{t('pfNameRequired')}</AppText> : null}
      </View>

      <View style={styles.row}>
        <View style={[styles.block, styles.flex]}>
          <BiText text={L('pfAge')} style={styles.label} />
          <TextInput
            accessibilityLabel={t('pfAge')}
            value={nf(age)}
            onChangeText={(text) => setAge(toAsciiDigits(text).replace(/\D/g, '').slice(0, 3))}
            keyboardType="number-pad"
            style={[styles.input, touched && !ageOk && styles.inputError]}
          />
          {touched && !ageOk ? <AppText style={styles.error}>{t('pfAgeInvalid')}</AppText> : null}
        </View>
        <View style={[styles.block, styles.genderBlock]}>
          <BiText text={L('pfGender')} style={styles.label} />
          <View style={styles.chips}>
            {GENDERS.map((g) => (
              <Chip key={g.key} label={t(g.label)} active={gender === g.key} onPress={() => setGender(g.key)} />
            ))}
          </View>
        </View>
      </View>

      <View style={styles.block}>
        <BiText text={L('pfBloodGroup')} style={styles.label} />
        <View style={styles.chips}>
          {BLOOD_GROUPS.map((b) => (
            <Chip key={b} label={b} active={bloodGroup === b} onPress={() => setBloodGroup(bloodGroup === b ? '' : b)} />
          ))}
        </View>
      </View>

      <View style={styles.block}>
        <BiText text={L('pfAllergies')} style={styles.label} />
        <TextInput
          accessibilityLabel={t('pfAllergies')}
          value={allergies}
          onChangeText={setAllergies}
          placeholder={t('pfAllergiesHint')}
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
      </View>

      <View style={styles.block}>
        <BiText text={L('pfChronic')} style={styles.label} />
        <View style={styles.chips}>
          {CHRONIC.map((c) => (
            <Chip key={c.key} label={t(c.label)} active={chronic.includes(c.key)} onPress={() => toggleChronic(c.key)} />
          ))}
        </View>
      </View>

      <View style={styles.block}>
        <BiText text={L('pfEmergencyContact')} style={styles.label} />
        <TextInput
          accessibilityLabel={t('pfEmergencyContact')}
          value={nf(contact)}
          onChangeText={(text) => setContact(toAsciiDigits(text).replace(/\D/g, '').slice(0, 11))}
          keyboardType="phone-pad"
          placeholder={t('pfEmergencyHint')}
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
      </View>

      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: consent }}
        onPress={() => setConsent((c) => !c)}
        style={[styles.consent, touched && !consent && styles.inputError]}
      >
        <View style={[styles.checkbox, consent && styles.checkboxOn]}>
          {consent ? <Ionicons name="checkmark" size={16} color={colors.surface} /> : null}
        </View>
        <View style={styles.flex}>
          <BiText text={L('pfConsent')} style={styles.consentText} />
          {touched && !consent ? <AppText style={styles.error}>{t('pfConsentRequired')}</AppText> : null}
        </View>
      </Pressable>

      <Pressable accessibilityRole="button" onPress={signOut} hitSlop={8} style={styles.logout}>
        <AppText style={styles.logoutText}>{t('logOut')}</AppText>
      </Pressable>
    </AppScreen>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <AppText style={[styles.chipText, active && styles.chipTextActive]}>{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, gap: 16 },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  block: { gap: 6 },
  row: { flexDirection: 'row', gap: 12 },
  genderBlock: { flex: 2 },
  label: { color: colors.text, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  input: {
    minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
    paddingHorizontal: 14, color: colors.text, fontSize: 15, fontFamily: FONT_FAMILIES.regular,
  },
  inputError: { borderColor: colors.danger },
  error: { color: colors.danger, fontSize: 12, lineHeight: 17 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { color: colors.text, fontSize: 13 },
  chipTextActive: { color: colors.surface },
  consent: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', padding: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.mint },
  checkbox: { width: 24, height: 24, borderRadius: 7, borderWidth: 1.5, borderColor: colors.brand, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: colors.brand },
  consentText: { color: colors.text, fontSize: 13, lineHeight: 20 },
  logout: { alignSelf: 'center', padding: 8 },
  logoutText: { color: colors.muted, fontSize: 13, textDecorationLine: 'underline' },
});
