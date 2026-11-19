import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Alpana } from '../components/Alpana';
import { PIN_LENGTH, PinInput } from '../components/PinInput';
import { ActionButton, AppScreen, AppText, BackButton, BiText, LanguagePill } from '../components/ui';
import colors from '../constants/colors';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { goBack } from '../utils/navigation';

/** Last step of sign-up (or "forgot PIN"): choose a 4-digit PIN, type it twice, then the app opens. */
export default function SetPinScreen() {
  const { t, L } = useLanguage();
  const { pending, session, finishPin } = useAuth();
  const [first, setFirst] = useState('');
  const [second, setSecond] = useState('');
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const [mismatch, setMismatch] = useState(false);
  const [saving, setSaving] = useState(false);

  // Opened without OTP / profile (refresh or deep link): start again from login.
  useEffect(() => {
    // Once the PIN is saved the session exists and the root layout leaves this screen by itself.
    if (!session && (!pending || !pending.profile)) router.replace('/login');
  }, [pending, session]);

  const reset = pending?.mode === 'reset';
  const title = reset ? 'pinResetTitle' : 'pinSetTitle';

  const onEnter = (value: string) => {
    setFirst(value);
    if (value.length === PIN_LENGTH) setStep('confirm');
  };

  const onConfirm = (value: string) => {
    setSecond(value);
    setMismatch(false);
    if (value.length < PIN_LENGTH) return;
    if (value !== first) {
      setMismatch(true);
      setSecond('');
    }
  };

  const save = async () => {
    if (saving || second !== first || first.length < PIN_LENGTH) return;
    setSaving(true);
    await finishPin(first);
    // The session changes, so the root layout moves to Home.
  };

  const back = () => {
    if (step === 'confirm') {
      setStep('enter');
      setFirst('');
      setSecond('');
      setMismatch(false);
    } else {
      goBack('/login');
    }
  };

  return (
    <AppScreen contentStyle={styles.content}>
      <View style={styles.alpana}><Alpana size={190} opacity={0.12} /></View>
      <View style={styles.topRow}>
        <View style={styles.backBox}><BackButton onPress={back} /></View>
        <LanguagePill />
      </View>

      <View style={styles.lock}><Ionicons name="lock-closed-outline" size={32} color={colors.brand} /></View>
      <BiText text={L(title)} style={styles.heading} subStyle={styles.headingSub} />
      <AppText style={styles.subtitle}>{t('pinSetSubtitle')}</AppText>

      <View style={styles.pinBlock}>
        <AppText style={styles.label}>{t(step === 'enter' ? 'pinEnter' : 'pinConfirmTitle')}</AppText>
        {step === 'enter' ? (
          <PinInput key="enter" value={first} onChange={onEnter} label={t('pinEnter')} />
        ) : (
          <PinInput key="confirm" value={second} onChange={onConfirm} error={mismatch} label={t('pinConfirmTitle')} />
        )}
        {mismatch ? <AppText style={styles.error}>{t('pinMismatch')}</AppText> : null}
      </View>

      <ActionButton label={t('pinSaveStart')} onPress={save} disabled={step !== 'confirm' || second !== first || saving} />

      <View style={styles.note}>
        <Ionicons name="phone-portrait-outline" size={20} color={colors.blueText} />
        <AppText style={styles.noteText}>{t('pinSavedOnDevice')}</AppText>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 14, gap: 16 },
  alpana: { position: 'absolute', top: -40, right: -50 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  lock: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.mint2, alignItems: 'center', justifyContent: 'center' },
  heading: { color: colors.brand, fontSize: 26, lineHeight: 38, fontWeight: '700' },
  headingSub: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  pinBlock: { gap: 12, alignItems: 'center', paddingVertical: 8 },
  label: { color: colors.text, fontSize: 14, lineHeight: 20, fontWeight: '700' },
  error: { color: colors.danger, fontSize: 13, lineHeight: 19 },
  note: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14, backgroundColor: colors.blue },
  noteText: { flex: 1, color: colors.blueText, fontSize: 13, lineHeight: 20 },
});
