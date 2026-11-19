import React from 'react';
import { View } from 'react-native';
import type { TranslationKey } from '../constants/i18n';
import { useLanguage } from '../context/LanguageContext';
import type { Profile } from '../services/data';
import { CATALOG_HOSPITALS, DEPARTMENTS } from '../services/mock';
import { ageFromDob, formatDobInput, isValidEmail, normalizePhone, toAsciiDigits } from '../utils/format';
import { Chip, FormField, FormInput, formStyles, PasswordInput } from './form';
import { AppText } from './ui';

/** The profile being typed, plus the password pair used only when creating an account. */
export type Draft = Profile & { password: string; confirm: string };
export type Errors = Partial<Record<keyof Draft, string>>;

export const MIN_PASSWORD = 6;

export function toDraft(profile: Profile): Draft {
  return { ...profile, password: '', confirm: '' };
}

const GENDERS: { key: Exclude<Profile['gender'], ''>; label: TranslationKey }[] = [
  { key: 'male', label: 'pfMale' },
  { key: 'female', label: 'pfFemale' },
  { key: 'other', label: 'pfOther' },
];

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

export const CHRONIC: { key: string; label: TranslationKey }[] = [
  { key: 'diabetes', label: 'chDiabetes' },
  { key: 'hypertension', label: 'chHypertension' },
  { key: 'asthma', label: 'chAsthma' },
  { key: 'heart', label: 'chHeart' },
  { key: 'kidney', label: 'chKidney' },
];

type Patch = (changes: Partial<Draft>) => void;

/** Step "basic info": name, phone, email, password, birth / age, gender, address. */
export function validateBasic(draft: Draft, t: (key: TranslationKey) => string, creating: boolean): Errors {
  const errors: Errors = {};
  if (!draft.name.trim()) errors.name = t('pfNameRequired');
  if (creating && normalizePhone(draft.phone) === null) errors.phone = t('phoneInvalid');
  if (draft.email.trim() && !isValidEmail(draft.email)) errors.email = t('suEmailInvalid');
  if (creating) {
    if (draft.password.length < MIN_PASSWORD) errors.password = t('suPasswordShort');
    if (draft.confirm !== draft.password) errors.confirm = t('suPasswordMismatch');
  }
  if (draft.dob && ageFromDob(draft.dob) === null) errors.dob = t('pfDobInvalid');
  const age = Number(draft.age);
  if (!draft.dob && draft.age !== '' && !(age > 0 && age < 120)) errors.age = t('pfAgeInvalid');
  return errors;
}

/** Step "details": the fields that depend on the role. */
export function validateDetails(draft: Draft, t: (key: TranslationKey) => string): Errors {
  const errors: Errors = {};
  const required = t('fieldRequired');
  switch (draft.role) {
    case 'doctor':
      if (!draft.bmdc.trim()) errors.bmdc = required;
      if (!draft.departmentId) errors.departmentId = required;
      if (!draft.hospitalId) errors.hospitalId = required;
      if (draft.fee !== '' && !(Number(draft.fee) >= 0)) errors.fee = required;
      break;
    case 'receptionist':
    case 'pharmacist':
      if (!draft.organization.trim()) errors.organization = required;
      if (!draft.staffId.trim()) errors.staffId = required;
      break;
    case 'hospitalAdmin':
      if (!draft.organization.trim()) errors.organization = required;
      if (!draft.designation.trim()) errors.designation = required;
      break;
    default:
      break;
  }
  return errors;
}

/** Clean profile ready to save: canonical phone, age taken from the birth date when there is one, trimmed text. */
export function toProfile(draft: Draft): Profile {
  const { password: _password, confirm: _confirm, ...profile } = draft;
  const dobAge = ageFromDob(profile.dob);
  return {
    ...profile,
    name: profile.name.trim(),
    phone: normalizePhone(profile.phone) ?? profile.phone,
    email: profile.email.trim(),
    age: dobAge !== null ? String(dobAge) : profile.age,
    district: profile.district.trim(),
    area: profile.area.trim(),
    allergies: profile.allergies.trim(),
    bmdc: profile.bmdc.trim(),
    degrees: profile.degrees.trim(),
    organization: profile.organization.trim(),
    staffId: profile.staffId.trim(),
    designation: profile.designation.trim(),
  };
}

const digits = (text: string, max: number) => toAsciiDigits(text).replace(/\D/g, '').slice(0, max);

/** Common fields. `creating` adds the phone and the password pair; when editing the phone is fixed. */
export function BasicFields({ draft, patch, errors, creating }: { draft: Draft; patch: Patch; errors: Errors; creating: boolean }) {
  const { t, L, nf } = useLanguage();
  const dobAge = ageFromDob(draft.dob);
  return (
    <View style={formStyles.flex}>
      <View style={{ gap: 16 }}>
        <FormInput label={L('pfFullName')} value={draft.name} onChangeText={(name) => patch({ name })} error={errors.name} />
        {creating ? (
          <FormInput
            label={L('mobileNumber')}
            value={nf(draft.phone)}
            onChangeText={(text) => patch({ phone: digits(text, 14) })}
            keyboardType="phone-pad"
            placeholder={t('loginIdentifierHint')}
            error={errors.phone}
          />
        ) : (
          <FormField label={L('mobileNumber')}>
            <AppText>{nf(draft.phone)}</AppText>
          </FormField>
        )}
        <FormInput
          label={L('suEmail')}
          value={draft.email}
          onChangeText={(email) => patch({ email })}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          error={errors.email}
        />
        {creating ? (
          <>
            <PasswordInput label={L('password')} value={draft.password} onChangeText={(password) => patch({ password })} error={errors.password} />
            <PasswordInput label={L('suConfirmPassword')} value={draft.confirm} onChangeText={(confirm) => patch({ confirm })} error={errors.confirm} />
          </>
        ) : null}
        <View style={formStyles.row}>
          <View style={formStyles.flex}>
            <FormInput
              label={L('pfAge')}
              value={nf(dobAge !== null ? String(dobAge) : draft.age)}
              editable={dobAge === null}
              onChangeText={(text) => patch({ age: digits(text, 3) })}
              keyboardType="number-pad"
              error={errors.age}
            />
          </View>
          <View style={formStyles.flex}>
            <FormInput
              label={L('pfDob')}
              value={nf(draft.dob)}
              onChangeText={(text) => patch({ dob: formatDobInput(text) })}
              keyboardType="number-pad"
              placeholder={t('pfDobHint')}
              maxLength={10}
              error={errors.dob}
            />
          </View>
        </View>
        <FormField label={L('pfGender')}>
          <View style={formStyles.chips}>
            {GENDERS.map((g) => (
              <Chip key={g.key} label={t(g.label)} active={draft.gender === g.key} onPress={() => patch({ gender: g.key })} />
            ))}
          </View>
        </FormField>
        <View style={formStyles.row}>
          <View style={formStyles.flex}>
            <FormInput label={L('pfDistrict')} value={draft.district} onChangeText={(district) => patch({ district })} placeholder={t('pfDistrictHint')} />
          </View>
          <View style={formStyles.flex}>
            <FormInput label={L('pfArea')} value={draft.area} onChangeText={(area) => patch({ area })} placeholder={t('pfAreaHint')} />
          </View>
        </View>
      </View>
    </View>
  );
}

/** Role-specific fields. */
export function DetailFields({ draft, patch, errors }: { draft: Draft; patch: Patch; errors: Errors }) {
  const { language, t, L, nf } = useLanguage();
  const toggleChronic = (key: string) =>
    patch({ chronic: draft.chronic.includes(key) ? draft.chronic.filter((k) => k !== key) : [...draft.chronic, key] });

  if (draft.role === 'patient') {
    return (
      <View style={{ gap: 16 }}>
        <FormField label={L('pfBloodGroup')}>
          <View style={formStyles.chips}>
            {BLOOD_GROUPS.map((b) => (
              <Chip key={b} label={b} active={draft.bloodGroup === b} onPress={() => patch({ bloodGroup: draft.bloodGroup === b ? '' : b })} />
            ))}
          </View>
        </FormField>
        <FormInput label={L('pfAllergies')} value={draft.allergies} onChangeText={(allergies) => patch({ allergies })} placeholder={t('pfAllergiesHint')} />
        <FormField label={L('pfChronic')}>
          <View style={formStyles.chips}>
            {CHRONIC.map((c) => (
              <Chip key={c.key} label={t(c.label)} active={draft.chronic.includes(c.key)} onPress={() => toggleChronic(c.key)} />
            ))}
          </View>
        </FormField>
        <FormInput
          label={L('pfEmergencyContact')}
          value={nf(draft.emergencyContact)}
          onChangeText={(text) => patch({ emergencyContact: digits(text, 11) })}
          keyboardType="phone-pad"
          placeholder={t('pfEmergencyHint')}
        />
      </View>
    );
  }

  if (draft.role === 'doctor') {
    return (
      <View style={{ gap: 16 }}>
        <FormInput label={L('suBmdc')} value={draft.bmdc} onChangeText={(bmdc) => patch({ bmdc })} placeholder={t('suBmdcHint')} autoCapitalize="characters" error={errors.bmdc} />
        <FormField label={L('suDepartment')} error={errors.departmentId}>
          <View style={formStyles.chips}>
            {DEPARTMENTS.map((d) => (
              <Chip key={d.id} label={d.name[language]} active={draft.departmentId === d.id} onPress={() => patch({ departmentId: d.id })} />
            ))}
          </View>
        </FormField>
        <FormField label={L('suHospital')} error={errors.hospitalId}>
          <View style={formStyles.chips}>
            {CATALOG_HOSPITALS.map((h) => (
              <Chip key={h.id} label={h.name[language]} active={draft.hospitalId === h.id} onPress={() => patch({ hospitalId: h.id })} />
            ))}
          </View>
        </FormField>
        <FormInput label={L('suDegrees')} value={draft.degrees} onChangeText={(degrees) => patch({ degrees })} placeholder={t('suDegreesHint')} />
        <FormInput
          label={L('suFee')}
          value={nf(draft.fee)}
          onChangeText={(text) => patch({ fee: digits(text, 5) })}
          keyboardType="number-pad"
          error={errors.fee}
        />
      </View>
    );
  }

  if (draft.role === 'receptionist' || draft.role === 'pharmacist') {
    return (
      <View style={{ gap: 16 }}>
        <FormInput label={L('suOrganization')} value={draft.organization} onChangeText={(organization) => patch({ organization })} error={errors.organization} />
        <FormInput label={L('suStaffId')} value={draft.staffId} onChangeText={(staffId) => patch({ staffId })} autoCapitalize="characters" error={errors.staffId} />
      </View>
    );
  }

  if (draft.role === 'hospitalAdmin') {
    return (
      <View style={{ gap: 16 }}>
        <FormInput label={L('suHospitalName')} value={draft.organization} onChangeText={(organization) => patch({ organization })} error={errors.organization} />
        <FormInput label={L('suDesignation')} value={draft.designation} onChangeText={(designation) => patch({ designation })} placeholder={t('suDesignationHint')} error={errors.designation} />
      </View>
    );
  }

  return null;
}
