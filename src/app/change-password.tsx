import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { PasswordInput } from '../components/form';
import { MIN_PASSWORD } from '../components/ProfileFields';
import { ActionButton, AppScreen, AppText, ScreenHeader } from '../components/ui';
import colors from '../constants/colors';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { goBack } from '../utils/navigation';

/** Change password (every role): current password, then the new one twice. */
export default function ChangePasswordScreen() {
  const { t, L } = useLanguage();
  const { changePassword } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (busy) return;
    if (next.length < MIN_PASSWORD) return setError(t('suPasswordShort'));
    if (next !== confirm) return setError(t('suPasswordMismatch'));
    if (next === current) return setError(t('cpSame'));
    setBusy(true);
    const ok = await changePassword(current, next);
    setBusy(false);
    if (!ok) return setError(t('cpWrongCurrent'));
    setError('');
    setDone(true);
  };

  const edit = (setter: (value: string) => void) => (text: string) => {
    setter(text);
    setError('');
  };

  return (
    <AppScreen
      header={<ScreenHeader title={L('changePassword')} onBack={() => goBack('/')} />}
      contentStyle={styles.content}
      footer={<View style={styles.flex}><ActionButton label={done ? t('goBack') : busy ? '…' : t('cpSave')} onPress={done ? () => goBack('/') : save} disabled={busy} /></View>}
    >
      {done ? (
        <View style={styles.success}>
          <Ionicons name="checkmark-circle" size={22} color={colors.brand} />
          <AppText style={styles.successText}>{t('cpDone')}</AppText>
        </View>
      ) : (
        <>
          <PasswordInput label={L('cpCurrent')} value={current} onChangeText={edit(setCurrent)} />
          <PasswordInput label={L('cpNew')} value={next} onChangeText={edit(setNext)} />
          <PasswordInput label={L('suConfirmPassword')} value={confirm} onChangeText={edit(setConfirm)} />
          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />
              <AppText style={styles.errorText}>{error}</AppText>
            </View>
          ) : null}
        </>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, gap: 16 },
  success: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14, backgroundColor: colors.mint2 },
  successText: { flex: 1, color: colors.brand, fontSize: 14, lineHeight: 21, fontWeight: '600' },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, backgroundColor: colors.redSoft },
  errorText: { flex: 1, color: colors.danger, fontSize: 13, lineHeight: 20 },
});
