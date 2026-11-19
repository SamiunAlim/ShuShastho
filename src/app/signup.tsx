import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { DEMO_OTP, OTP_LENGTH, OtpInput } from '../components/OtpInput';
import {
  BasicFields,
  DetailFields,
  toDraft,
  toProfile,
  validateBasic,
  validateDetails,
  type Draft,
  type Errors,
} from '../components/ProfileFields';
import { StepIndicator } from '../components/StepIndicator';
import { ActionButton, AppScreen, AppText, BiText, ScreenHeader } from '../components/ui';
import colors from '../constants/colors';
import type { TranslationKey } from '../constants/i18n';
import { ROLE_META } from '../constants/roles';
import { EMPTY_PROFILE, Role, SIGNUP_ROLES, useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { isTaken } from '../services/data';
import { normalizePhone } from '../utils/format';
import { goBack } from '../utils/navigation';

const STEP_KEYS: TranslationKey[] = ['suStepRole', 'suStepBasic', 'suStepDetails', 'suStepVerify'];
const STEP = { role: 0, basic: 1, details: 2, verify: 3 } as const;

const ROLE_DESC: Record<string, TranslationKey> = {
  patient: 'suRoleDescPatient',
  doctor: 'suRoleDescDoctor',
  receptionist: 'suRoleDescReceptionist',
  pharmacist: 'suRoleDescPharmacist',
  hospitalAdmin: 'suRoleDescHospitalAdmin',
};

/** Create account: role → basic info → role details → OTP (mock 123456) → account created → that role's home. */
export default function SignupScreen() {
  const { t, L, nf } = useLanguage();
  const { signUp } = useAuth();
  const [step, setStep] = useState<number>(STEP.role);
  const [draft, setDraft] = useState<Draft>(toDraft(EMPTY_PROFILE));
  const [errors, setErrors] = useState<Errors>({});
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [busy, setBusy] = useState(false);

  const patch = (changes: Partial<Draft>) => {
    setDraft((current) => ({ ...current, ...changes }));
    setErrors((current) => {
      const next = { ...current };
      (Object.keys(changes) as (keyof Draft)[]).forEach((key) => delete next[key]);
      return next;
    });
  };

  const chooseRole = (role: Role) => {
    patch({ role });
    setStep(STEP.basic);
  };

  const back = () => {
    if (step === STEP.role) goBack('/splash');
    else setStep((current) => current - 1);
  };

  const nextFromBasic = async () => {
    const found = validateBasic(draft, t, true);
    if (Object.keys(found).length > 0) return setErrors(found);
    setBusy(true);
    const taken = await isTaken(normalizePhone(draft.phone) ?? draft.phone, draft.email);
    setBusy(false);
    if (taken) return setErrors(taken === 'phone_taken' ? { phone: t('suPhoneTaken') } : { email: t('suEmailTaken') });
    setStep(STEP.details);
  };

  const nextFromDetails = () => {
    const found = validateDetails(draft, t);
    if (Object.keys(found).length > 0) return setErrors(found);
    setCode('');
    setCodeError('');
    setStep(STEP.verify);
  };

  const createAccount = async () => {
    if (busy || code.length < OTP_LENGTH) return;
    if (code !== DEMO_OTP) return setCodeError(t('otpWrong'));
    setBusy(true);
    const problem = await signUp(toProfile(draft), draft.password);
    // On success the session changes and the root layout opens the role's home.
    if (problem) {
      setBusy(false);
      setStep(STEP.basic);
      setErrors(problem === 'phone_taken' ? { phone: t('suPhoneTaken') } : { email: t('suEmailTaken') });
    }
  };

  const footer =
    step === STEP.basic ? <ActionButton label={busy ? '…' : t('bkNext')} onPress={nextFromBasic} disabled={busy} />
    : step === STEP.details ? <ActionButton label={t('bkNext')} onPress={nextFromDetails} />
    : step === STEP.verify ? (
      <ActionButton label={busy ? '…' : t('suVerifyAndCreate')} onPress={createAccount} disabled={busy || code.length < OTP_LENGTH} />
    ) : undefined;

  return (
    <AppScreen
      header={
        <ScreenHeader title={L('suTitle')} onBack={back}>
          <StepIndicator steps={STEP_KEYS.map((key) => L(key))} current={step} />
        </ScreenHeader>
      }
      footer={footer ? <View style={styles.flex}>{footer}</View> : undefined}
      contentStyle={styles.content}
    >
      {step === STEP.role && (
        <>
          <BiText text={L('suChooseRole')} style={styles.title} />
          {SIGNUP_ROLES.map((role) => (
            <Pressable
              key={role}
              accessibilityRole="button"
              accessibilityState={{ selected: draft.role === role }}
              onPress={() => chooseRole(role)}
              style={({ pressed }) => [styles.roleCard, draft.role === role && styles.roleCardActive, pressed && styles.pressed]}
            >
              <View style={styles.roleIcon}><Ionicons name={ROLE_META[role].icon} size={24} color={colors.brand} /></View>
              <View style={styles.flex}>
                <BiText text={L(ROLE_META[role].label)} style={styles.roleName} subStyle={styles.roleSub} />
                <AppText style={styles.roleDesc}>{t(ROLE_DESC[role])}</AppText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.brand} />
            </Pressable>
          ))}
        </>
      )}

      {step === STEP.basic && (
        <>
          <BiText text={L('suBasicTitle')} style={styles.title} />
          <BasicFields draft={draft} patch={patch} errors={errors} creating />
        </>
      )}

      {step === STEP.details && (
        <>
          <BiText text={L('suDetailsTitle')} style={styles.title} />
          <AppText style={styles.roleTag}>{t(ROLE_META[draft.role].label)}</AppText>
          <DetailFields draft={draft} patch={patch} errors={errors} />
        </>
      )}

      {step === STEP.verify && (
        <>
          <View style={styles.shield}><Ionicons name="shield-checkmark-outline" size={34} color={colors.brand} /></View>
          <BiText text={L('suVerifyTitle')} style={styles.title} />
          <AppText style={styles.sent}>{t('otpSentTo').replace('{phone}', nf((normalizePhone(draft.phone) ?? draft.phone).slice(1)))}</AppText>
          <OtpInput value={code} onChange={(next) => { setCode(next); setCodeError(''); }} label={t('otpTitle')} error={!!codeError} />
          {codeError ? <AppText style={styles.error}>{codeError}</AppText> : null}
          <AppText style={styles.hint}>{t('otpDemoHintPatient')}</AppText>
        </>
      )}

      {step === STEP.role && (
        <Pressable accessibilityRole="link" onPress={() => router.replace('/login')} hitSlop={8} style={styles.haveAccount}>
          <AppText style={styles.haveAccountText}>{t('suHaveAccount')} <AppText style={styles.haveAccountLink}>{t('logIn')}</AppText></AppText>
        </Pressable>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, gap: 16 },
  pressed: { opacity: 0.85 },
  title: { color: colors.text, fontSize: 18, lineHeight: 26, fontWeight: '700' },
  roleCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1,
    borderColor: colors.border, backgroundColor: colors.surface,
  },
  roleCardActive: { borderColor: colors.brand, borderWidth: 2, backgroundColor: colors.mint },
  roleIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: colors.mint2, alignItems: 'center', justifyContent: 'center' },
  roleName: { color: colors.text, fontSize: 16, lineHeight: 24, fontWeight: '700' },
  roleSub: { fontSize: 10, lineHeight: 14 },
  roleDesc: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  roleTag: { alignSelf: 'flex-start', color: colors.brand, backgroundColor: colors.mint2, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, fontSize: 12, fontWeight: '700' },
  shield: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.mint2, alignItems: 'center', justifyContent: 'center' },
  sent: { color: colors.text, fontSize: 13, lineHeight: 20 },
  error: { color: colors.danger, fontSize: 13, lineHeight: 19 },
  hint: { color: colors.yellowText, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  haveAccount: { alignSelf: 'center', padding: 6 },
  haveAccountText: { color: colors.muted, fontSize: 14 },
  haveAccountLink: { color: colors.brand, fontWeight: '700' },
});
