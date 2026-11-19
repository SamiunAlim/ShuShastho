import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Alpana } from '../components/Alpana';
import { FormInput, PasswordInput } from '../components/form';
import { ActionButton, AppScreen, AppText, BackButton, BiText, LanguagePill, Logo } from '../components/ui';
import colors from '../constants/colors';
import { ROLE_META } from '../constants/roles';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '../services/data';
import { call999 } from '../utils/emergency';
import { goBack } from '../utils/navigation';

export default function LoginScreen() {
  const { language, t, L, nf } = useLanguage();
  const { login } = useAuth();
  const { reset } = useLocalSearchParams<{ reset?: string }>();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [callError, setCallError] = useState(false);

  const submit = async () => {
    if (busy) return;
    if (!identifier.trim() || !password) {
      setError(t('loginRequired'));
      return;
    }
    setError('');
    setBusy(true);
    const ok = await login(identifier, password);
    // On success the session changes and the root layout opens that role's home.
    if (!ok) {
      setError(t('loginInvalid'));
      setBusy(false);
    }
  };

  return (
    <AppScreen contentStyle={styles.content}>
      <View style={styles.alpana}><Alpana size={190} opacity={0.12} /></View>

      <View style={styles.topRow}>
        <View style={styles.brand}>
          <BackButton onPress={() => goBack('/splash')} />
          <Logo />
          <View>
            <AppText style={styles.brandName}>{language === 'bn' ? 'সুস্বাস্থ্য' : 'ShuShastho'}</AppText>
            {language === 'bn' ? <AppText style={styles.brandSub}>ShuShastho</AppText> : null}
          </View>
        </View>
        <LanguagePill />
      </View>

      <BiText text={L('loginWelcome')} style={styles.heading} subStyle={styles.headingSub} />

      {reset ? (
        <View style={styles.success}>
          <Ionicons name="checkmark-circle" size={20} color={colors.brand} />
          <AppText style={styles.successText}>{t('passwordResetDone')}</AppText>
        </View>
      ) : null}

      <View style={styles.form}>
        <FormInput
          label={L('loginIdentifier')}
          value={identifier}
          onChangeText={(text) => { setIdentifier(text); setError(''); }}
          placeholder={t('loginIdentifierHint')}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="username"
        />
        <PasswordInput
          label={L('password')}
          value={password}
          onChangeText={(text) => { setPassword(text); setError(''); }}
          onSubmitEditing={submit}
          returnKeyType="go"
        />
        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />
            <AppText style={styles.errorText}>{error}</AppText>
          </View>
        ) : null}
      </View>

      <ActionButton label={busy ? '…' : t('logIn')} onPress={submit} disabled={busy} />

      <Pressable accessibilityRole="link" onPress={() => router.push('/forgot-password')} hitSlop={8} style={styles.forgot}>
        <AppText style={styles.forgotText}>{t('forgotPassword')}</AppText>
      </Pressable>

      <View style={styles.dividerRow}>
        <View style={styles.line} />
        <AppText style={styles.or}>{t('orDivider')}</AppText>
        <View style={styles.line} />
      </View>

      <ActionButton label={t('createAccount')} onPress={() => router.push('/signup')} variant="secondary" />

      <View style={styles.demoCard}>
        <BiText text={L('demoAccounts')} style={styles.demoTitle} subStyle={styles.demoSub} />
        <AppText style={styles.demoHint}>{t('demoAccountsHint')}</AppText>
        {DEMO_ACCOUNTS.map(({ profile }) => (
          <Pressable
            key={profile.phone}
            accessibilityRole="button"
            onPress={() => { setIdentifier(profile.phone); setPassword(DEMO_PASSWORD); setError(''); }}
            style={({ pressed }) => [styles.demoRow, pressed && styles.pressed]}
          >
            <Ionicons name={ROLE_META[profile.role].icon} size={16} color={colors.brand} />
            <AppText style={styles.demoRole}>{t(ROLE_META[profile.role].label)}</AppText>
            <AppText style={styles.demoPhone}>{nf(profile.phone)}</AppText>
          </Pressable>
        ))}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('call999')}
        onPress={() => call999(() => setCallError(true))}
        style={({ pressed }) => [styles.sosCard, pressed && styles.pressed]}
      >
        <Ionicons name="call-outline" size={22} color={colors.danger} />
        <View style={styles.flex}>
          <AppText style={styles.sosTitle}>{t('emergencyNoLogin')}</AppText>
          {language === 'bn' ? <AppText style={styles.sosSub}>{L('emergencyNoLogin').en}</AppText> : null}
          {callError ? <AppText style={styles.sosSub}>{t('callUnavailable')}</AppText> : null}
        </View>
      </Pressable>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingTop: 14, gap: 16 },
  alpana: { position: 'absolute', top: -40, right: -50 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandName: { color: colors.brand, fontSize: 18, lineHeight: 24, fontWeight: '700' },
  brandSub: { color: colors.muted, fontSize: 11, lineHeight: 15 },
  heading: { color: colors.brand, fontSize: 28, lineHeight: 40, fontWeight: '700' },
  headingSub: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  success: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, backgroundColor: colors.mint2 },
  successText: { flex: 1, color: colors.brand, fontSize: 13, lineHeight: 20, fontWeight: '600' },
  form: { gap: 14 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, backgroundColor: colors.redSoft },
  errorText: { flex: 1, color: colors.danger, fontSize: 13, lineHeight: 20 },
  forgot: { alignSelf: 'center', padding: 4 },
  forgotText: { color: colors.brand, fontSize: 14, fontWeight: '700' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  or: { color: colors.muted, fontSize: 13 },
  demoCard: { gap: 6, padding: 14, borderRadius: 14, backgroundColor: colors.mint, borderWidth: 1, borderColor: colors.border },
  demoTitle: { color: colors.brand, fontSize: 13, lineHeight: 20, fontWeight: '700' },
  demoSub: { fontSize: 10 },
  demoHint: { color: colors.muted, fontSize: 11, lineHeight: 16, marginBottom: 4 },
  demoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  demoRole: { flex: 1, color: colors.text, fontSize: 13 },
  demoPhone: { color: colors.brand, fontSize: 13, fontWeight: '700' },
  sosCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, backgroundColor: colors.redSoft },
  sosTitle: { color: colors.danger, fontSize: 13, lineHeight: 20, fontWeight: '700' },
  sosSub: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  pressed: { opacity: 0.85 },
});
