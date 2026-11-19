import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Alpana } from '../components/Alpana';
import { FormInput, PasswordInput } from '../components/form';
import { ActionButton, AppScreen, AppText, BackButton, BiText, LanguagePill, Logo } from '../components/ui';
import colors from '../constants/colors';
import { ROLE_META } from '../constants/roles';
import { Role, useAuth, VISIBLE_ROLES } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '../services/data';
import { call999 } from '../utils/emergency';
import { goBack } from '../utils/navigation';

/** Log in: choose a role → phone/email + password → that role's home. */
export default function LoginScreen() {
  const { language, t, L } = useLanguage();
  const { login } = useAuth();
  const { reset } = useLocalSearchParams<{ reset?: string }>();
  const [role, setRole] = useState<Role | null>(null);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [callError, setCallError] = useState(false);

  const demo = role ? DEMO_ACCOUNTS.find((account) => account.profile.role === role)?.profile : undefined;

  const chooseRole = (next: Role) => {
    setRole(next);
    setError('');
  };

  const back = () => {
    if (role) {
      setRole(null);
      setError('');
    } else {
      goBack('/splash');
    }
  };

  const submit = async () => {
    if (busy || !role) return;
    if (!identifier.trim() || !password) {
      setError(t('loginRequired'));
      return;
    }
    setError('');
    setBusy(true);
    const result = await login(identifier, password, role);
    // On success the session changes and the root layout opens that role's home.
    if (!result.ok) {
      setError(
        result.reason === 'role'
          ? t('loginRoleMismatch').replace(/\{role\}/g, t(ROLE_META[result.actual].label))
          : t('loginInvalid'),
      );
      setBusy(false);
    }
  };

  return (
    <AppScreen contentStyle={styles.content}>
      <View style={styles.alpana}><Alpana size={190} opacity={0.12} /></View>

      <View style={styles.topRow}>
        <View style={styles.brand}>
          <BackButton onPress={back} />
          <Logo />
          <View>
            <AppText style={styles.brandName}>{language === 'bn' ? 'সুস্বাস্থ্য' : 'ShuShastho'}</AppText>
            {language === 'bn' ? <AppText style={styles.brandSub}>ShuShastho</AppText> : null}
          </View>
        </View>
        <LanguagePill />
      </View>

      {reset ? (
        <View style={styles.success}>
          <Ionicons name="checkmark-circle" size={20} color={colors.brand} />
          <AppText style={styles.successText}>{t('passwordResetDone')}</AppText>
        </View>
      ) : null}

      {role === null ? (
        <>
          <BiText text={L('loginAsTitle')} style={styles.heading} subStyle={styles.headingSub} />
          <View style={styles.roles}>
            {VISIBLE_ROLES.map((key) => (
              <Pressable
                key={key}
                accessibilityRole="button"
                onPress={() => chooseRole(key)}
                style={({ pressed }) => [styles.roleCard, pressed && styles.pressed]}
              >
                <View style={styles.roleIcon}><Ionicons name={ROLE_META[key].icon} size={28} color={colors.brand} /></View>
                <BiText text={L(ROLE_META[key].label)} style={styles.roleName} subStyle={styles.roleSub} />
                <Ionicons name="chevron-forward" size={18} color={colors.brand} />
              </Pressable>
            ))}
          </View>
        </>
      ) : (
        <>
          <View style={styles.chosen}>
            <View style={styles.roleIconSmall}><Ionicons name={ROLE_META[role].icon} size={22} color={colors.brand} /></View>
            <BiText text={L(ROLE_META[role].label)} style={styles.chosenName} subStyle={styles.roleSub} />
            <Pressable accessibilityRole="link" onPress={back} hitSlop={8}>
              <AppText style={styles.change}>{t('loginChange')}</AppText>
            </Pressable>
          </View>

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

          {demo ? (
            <View style={styles.demoCard}>
              <BiText text={L('demoLoginFor', { phone: demo.phone })} style={styles.demoText} />
              <Pressable
                accessibilityRole="button"
                onPress={() => { setIdentifier(demo.phone); setPassword(DEMO_PASSWORD); setError(''); }}
                style={({ pressed }) => [styles.demoButton, pressed && styles.pressed]}
              >
                <AppText style={styles.demoButtonText}>{t('useDemoAccount')}</AppText>
              </Pressable>
            </View>
          ) : null}
        </>
      )}

      <View style={styles.dividerRow}>
        <View style={styles.line} />
        <AppText style={styles.or}>{t('orDivider')}</AppText>
        <View style={styles.line} />
      </View>

      <ActionButton label={t('createAccount')} onPress={() => router.push('/signup')} variant="secondary" />

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
  roles: { gap: 12 },
  roleCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 76, padding: 14, borderRadius: 18, borderWidth: 1,
    borderColor: colors.border, backgroundColor: colors.surface,
  },
  roleIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: colors.mint2, alignItems: 'center', justifyContent: 'center' },
  roleIconSmall: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.mint2, alignItems: 'center', justifyContent: 'center' },
  roleName: { flex: 1, color: colors.text, fontSize: 17, lineHeight: 25, fontWeight: '700' },
  roleSub: { color: colors.muted, fontSize: 11, lineHeight: 15 },
  chosen: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, backgroundColor: colors.mint, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.green2 },
  chosenName: { flex: 1, color: colors.brand, fontSize: 17, lineHeight: 25, fontWeight: '700' },
  change: { color: colors.brand, fontSize: 14, fontWeight: '700', textDecorationLine: 'underline' },
  form: { gap: 14 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, backgroundColor: colors.redSoft },
  errorText: { flex: 1, color: colors.danger, fontSize: 13, lineHeight: 20 },
  forgot: { alignSelf: 'center', padding: 4 },
  forgotText: { color: colors.brand, fontSize: 14, fontWeight: '700' },
  demoCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, backgroundColor: colors.yellow },
  demoText: { flex: 1, color: colors.yellowText, fontSize: 12, lineHeight: 18 },
  demoButton: { borderRadius: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.yellowText, paddingHorizontal: 12, paddingVertical: 8 },
  demoButtonText: { color: colors.yellowText, fontSize: 12, fontWeight: '700' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  or: { color: colors.muted, fontSize: 13 },
  sosCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, backgroundColor: colors.redSoft },
  sosTitle: { color: colors.danger, fontSize: 13, lineHeight: 20, fontWeight: '700' },
  sosSub: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  pressed: { opacity: 0.85 },
});
