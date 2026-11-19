import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Alpana } from '../components/Alpana';
import { ActionButton, AppScreen, AppText, BackButton, BiText, FONT_FAMILIES, KanthaCard, LanguagePill } from '../components/ui';
import colors from '../constants/colors';
import { ROLE_META } from '../constants/roles';
import { ROLES, Role, useAuth, VISIBLE_ROLES } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { toAsciiDigits } from '../utils/format';
import { goBack } from '../utils/navigation';

const CODE_LENGTH = 6;
const RESEND_SECONDS = 42;
const PATIENT_DEMO_CODE = '123456';

function maskPhone(phone: string): string {
  const national = phone.replace(/^0/, '');
  if (national.length < 8) return national;
  return `${national.slice(0, 4)}-XXX${national.slice(-3)}`;
}

export default function OtpScreen() {
  const { t, L, nf, language } = useLanguage();
  const { signIn, startPatientAuth } = useAuth();
  const params = useLocalSearchParams<{ phone?: string; role?: string }>();
  const phone = typeof params.phone === 'string' ? params.phone : '';
  const role: Role = ROLES.find((r) => r === params.role) ?? 'patient';

  const [code, setCode] = useState('');
  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const [wrong, setWrong] = useState(false);

  useEffect(() => {
    if (seconds <= 0) return;
    const id = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [seconds]);

  const complete = code.length === CODE_LENGTH;
  // Mock verification. Patients need the demo code 123456; staff accept any 6 digits.
  // A real backend would check the code here.
  const verify = () => {
    if (!complete) return;
    if (role !== 'patient') {
      signIn({ role, phone });
      return;
    }
    if (code !== PATIENT_DEMO_CODE) {
      setWrong(true);
      return;
    }
    // New phone → profile setup then PIN; the saved phone (forgot PIN) → just a new PIN.
    router.push(startPatientAuth(phone) === 'reset' ? '/set-pin' : '/profile-setup');
  };

  const time = `0:${String(seconds).padStart(2, '0')}`;

  return (
    <AppScreen contentStyle={styles.content}>
      <View style={styles.alpana}><Alpana size={190} opacity={0.12} /></View>

      <View style={styles.topRow}>
        <BackButtonBox />
        <LanguagePill />
      </View>

      <View style={styles.shield}><Ionicons name="shield-checkmark-outline" size={34} color={colors.brand} /></View>

      <BiText text={L('otpTitle')} style={styles.heading} subStyle={styles.headingSub} />

      <View>
        <AppText style={styles.sent}>{t('otpSentTo').replace('{phone}', nf(maskPhone(phone)))}</AppText>
        <View style={styles.sentRow}>
          {language === 'bn' ? (
            <AppText style={styles.sentSub}>{L('otpSentTo', { phone: maskPhone(phone) }).en} · </AppText>
          ) : null}
          <Pressable accessibilityRole="link" onPress={() => goBack('/login')} hitSlop={8}>
            <AppText style={styles.change}>{t('otpChange')}</AppText>
          </Pressable>
        </View>
      </View>

      <View>
        <View style={styles.boxes}>
          {Array.from({ length: CODE_LENGTH }, (_, i) => {
            const filled = i < code.length;
            const active = i === Math.min(code.length, CODE_LENGTH - 1) && !complete;
            return (
              <View key={i} style={[styles.box, filled && styles.boxFilled, active && styles.boxActive]}>
                <AppText style={styles.boxText}>{filled ? nf(code[i]) : ''}</AppText>
              </View>
            );
          })}
          {/* Invisible input stretched over the boxes: tapping a box focuses it. */}
          <TextInput
            accessibilityLabel={t('otpTitle')}
            value={code}
            onChangeText={(text) => {
              setWrong(false);
              setCode(toAsciiDigits(text).replace(/\D/g, '').slice(0, CODE_LENGTH));
            }}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
            maxLength={CODE_LENGTH}
            autoFocus
            caretHidden
            onSubmitEditing={verify}
            style={styles.hiddenInput}
          />
        </View>
      </View>

      <View style={styles.resendBlock}>
        {seconds > 0 ? (
          <View style={styles.resendRow}>
            <Ionicons name="time-outline" size={15} color={colors.muted} />
            <AppText style={styles.resend}>
              {language === 'bn' ? `${L('otpResendIn', { time }).bn} · ${L('otpResendIn', { time }).en}` : t('otpResendIn').replace('{time}', time)}
            </AppText>
          </View>
        ) : (
          <Pressable accessibilityRole="button" onPress={() => setSeconds(RESEND_SECONDS)} hitSlop={8}>
            <AppText style={styles.resendLink}>{t('otpResend')}</AppText>
          </Pressable>
        )}
        {wrong ? <AppText style={styles.wrong}>{t('otpWrong')}</AppText> : null}
        <AppText style={styles.demoHint}>{t(role === 'patient' ? 'otpDemoHintPatient' : 'otpDemoHint')}</AppText>
      </View>

      <ActionButton
        label={language === 'bn' ? `${t('otpVerify')} · ${L('otpVerify').en}` : t('otpVerify')}
        onPress={verify}
        disabled={!complete}
      />

      <KanthaCard style={styles.afterCard}>
        <BiText text={L('afterVerifying')} style={styles.afterTitle} subStyle={styles.afterSub} />
        <View style={styles.afterList}>
          {VISIBLE_ROLES.map((key) => (
            <View key={key} style={styles.afterRow}>
              <View style={[styles.rolePill, key === role && styles.rolePillActive]}>
                <AppText style={[styles.rolePillText, key === role && styles.rolePillTextActive]}>{t(ROLE_META[key].label)}</AppText>
              </View>
              <Ionicons name="arrow-forward" size={14} color={colors.muted} />
              <AppText style={styles.afterDest}>{t(ROLE_META[key].destination)}</AppText>
            </View>
          ))}
        </View>
      </KanthaCard>
    </AppScreen>
  );
}

/** Back button in the white rounded box used by the Figma auth screens. */
function BackButtonBox() {
  return (
    <View style={styles.backBox}>
      <BackButton onPress={() => goBack('/login')} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 14, gap: 16 },
  alpana: { position: 'absolute', top: -40, right: -50 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  shield: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.mint2, alignItems: 'center', justifyContent: 'center' },
  heading: { color: colors.brand, fontSize: 28, lineHeight: 40, fontWeight: '700' },
  headingSub: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  sent: { color: colors.text, fontSize: 13, lineHeight: 20 },
  sentRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  sentSub: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  change: { color: colors.brand, fontSize: 11, lineHeight: 16, fontWeight: '700', textDecorationLine: 'underline' },
  boxes: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  box: {
    flex: 1, maxWidth: 52, aspectRatio: 0.9, borderRadius: 12, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
  },
  boxFilled: { borderWidth: 1.5, borderColor: colors.brand },
  boxActive: { borderWidth: 2, borderColor: colors.brand },
  boxText: { color: colors.text, fontSize: 24, lineHeight: 34, fontWeight: '700' },
  hiddenInput: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, opacity: 0.02, color: 'transparent', fontFamily: FONT_FAMILIES.regular },
  resendBlock: { alignItems: 'center', gap: 4 },
  resendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  resend: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  resendLink: { color: colors.brand, fontSize: 13, fontWeight: '700' },
  wrong: { color: colors.danger, fontSize: 12, lineHeight: 18 },
  demoHint: { color: colors.yellowText, fontSize: 11, lineHeight: 16 },
  afterCard: { gap: 10, backgroundColor: colors.mint },
  afterTitle: { color: colors.brand, fontSize: 13, lineHeight: 20, fontWeight: '700' },
  afterSub: { fontSize: 10 },
  afterList: { gap: 8 },
  afterRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rolePill: { minWidth: 92, alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: colors.mint2 },
  rolePillActive: { backgroundColor: colors.brand },
  rolePillText: { color: colors.brand, fontSize: 12, fontWeight: '600' },
  rolePillTextActive: { color: colors.surface },
  afterDest: { flex: 1, color: colors.text, fontSize: 13, lineHeight: 20 },
});
