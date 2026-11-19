import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Alpana } from '../components/Alpana';
import { FormInput, PasswordInput } from '../components/form';
import { DEMO_OTP, OTP_LENGTH, OtpInput } from '../components/OtpInput';
import { MIN_PASSWORD } from '../components/ProfileFields';
import { ActionButton, AppScreen, AppText, BackButton, BiText, LanguagePill } from '../components/ui';
import colors from '../constants/colors';
import { useLanguage } from '../context/LanguageContext';
import { accountExists, resetPassword } from '../services/data';
import { goBack } from '../utils/navigation';

type Step = 'identify' | 'otp' | 'password';

/** Forgot password: phone/email → OTP (mock 123456) → new password → back to Log in. */
export default function ForgotPasswordScreen() {
  const { t, L } = useLanguage();
  const [step, setStep] = useState<Step>('identify');
  const [identifier, setIdentifier] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const back = () => {
    setError('');
    if (step === 'otp') setStep('identify');
    else if (step === 'password') setStep('otp');
    else goBack('/login');
  };

  const sendCode = async () => {
    if (busy) return;
    setBusy(true);
    const found = identifier.trim() !== '' && (await accountExists(identifier));
    setBusy(false);
    if (!found) {
      setError(t('fpNotFound'));
      return;
    }
    setError('');
    setCode('');
    setStep('otp');
  };

  const verify = () => {
    if (code.length < OTP_LENGTH) return;
    if (code !== DEMO_OTP) {
      setError(t('otpWrong'));
      return;
    }
    setError('');
    setStep('password');
  };

  const save = async () => {
    if (busy) return;
    if (password.length < MIN_PASSWORD) return setError(t('suPasswordShort'));
    if (password !== confirm) return setError(t('suPasswordMismatch'));
    setBusy(true);
    await resetPassword(identifier, password);
    router.replace({ pathname: '/login', params: { reset: '1' } });
  };

  const icon = step === 'password' ? 'lock-closed-outline' : step === 'otp' ? 'shield-checkmark-outline' : 'key-outline';
  const heading = step === 'otp' ? 'otpTitle' : step === 'password' ? 'fpNewPassword' : 'fpTitle';

  return (
    <AppScreen contentStyle={styles.content}>
      <View style={styles.alpana}><Alpana size={190} opacity={0.12} /></View>
      <View style={styles.topRow}>
        <BackButton onPress={back} />
        <LanguagePill />
      </View>

      <View style={styles.icon}><Ionicons name={icon} size={32} color={colors.brand} /></View>
      <BiText text={L(heading)} style={styles.heading} subStyle={styles.headingSub} />

      {step === 'identify' && (
        <>
          <AppText style={styles.subtitle}>{t('fpSubtitle')}</AppText>
          <FormInput
            label={L('loginIdentifier')}
            value={identifier}
            onChangeText={(text) => { setIdentifier(text); setError(''); }}
            placeholder={t('loginIdentifierHint')}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            error={error}
          />
          <ActionButton label={busy ? '…' : t('fpSendCode')} onPress={sendCode} disabled={busy} />
        </>
      )}

      {step === 'otp' && (
        <>
          <OtpInput value={code} onChange={(next) => { setCode(next); setError(''); }} label={t('otpTitle')} error={!!error} />
          {error ? <AppText style={styles.error}>{error}</AppText> : null}
          <AppText style={styles.hint}>{t('otpDemoHintPatient')}</AppText>
          <ActionButton label={t('otpVerify')} onPress={verify} disabled={code.length < OTP_LENGTH} />
        </>
      )}

      {step === 'password' && (
        <>
          <PasswordInput label={L('fpNewPasswordLabel')} value={password} onChangeText={(text) => { setPassword(text); setError(''); }} />
          <PasswordInput label={L('suConfirmPassword')} value={confirm} onChangeText={(text) => { setConfirm(text); setError(''); }} />
          {error ? <AppText style={styles.error}>{error}</AppText> : null}
          <ActionButton label={busy ? '…' : t('fpSave')} onPress={save} disabled={busy} />
        </>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 14, gap: 16 },
  alpana: { position: 'absolute', top: -40, right: -50 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  icon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.mint2, alignItems: 'center', justifyContent: 'center' },
  heading: { color: colors.brand, fontSize: 26, lineHeight: 38, fontWeight: '700' },
  headingSub: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  error: { color: colors.danger, fontSize: 13, lineHeight: 19 },
  hint: { color: colors.yellowText, fontSize: 12, lineHeight: 18, textAlign: 'center' },
});
