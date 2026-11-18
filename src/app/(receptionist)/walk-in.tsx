import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { ActionButton, AppScreen, AppText, BiText, FONT_FAMILIES, KanthaCard, ScreenHeader } from '../../components/ui';
import colors from '../../constants/colors';
import { useDesk } from '../../context/DeskContext';
import { useLanguage } from '../../context/LanguageContext';
import { toAsciiDigits } from '../../utils/format';

/** Walk-in registration: issues the next serial and checks the patient in. */
export default function WalkInScreen() {
  const { t, tf, L, nf } = useLanguage();
  const desk = useDesk();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const [issued, setIssued] = useState<number | null>(null);

  const nameMissing = name.trim().length === 0;

  const submit = () => {
    setTouched(true);
    if (nameMissing) return;
    const patient = desk.addWalkIn({ name: name.trim(), phone, age: Number(age) || 0, reason: reason.trim() });
    setIssued(patient.serial);
  };

  return (
    <AppScreen
      header={<ScreenHeader title={L('wiTitle')} onBack={() => router.back()} />}
      contentStyle={styles.content}
      footer={
        <View style={styles.flex}>
          {issued === null
            ? <ActionButton label={t('wiIssue')} onPress={submit} />
            : <ActionButton label={t('wiBack')} onPress={() => router.back()} />}
        </View>
      }
    >
      {issued !== null ? (
        <KanthaCard style={styles.done}>
          <View style={styles.doneIcon}><Ionicons name="checkmark" size={30} color={colors.surface} /></View>
          <AppText style={styles.doneTitle}>{tf('wiIssued', { n: issued })}</AppText>
          <AppText style={styles.hint}>{t('wiIssuedHint')}</AppText>
        </KanthaCard>
      ) : (
        <>
          <Field label={L('wiName')}>
            <TextInput
              accessibilityLabel={t('wiName')}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              style={[styles.input, touched && nameMissing && styles.inputError]}
            />
            {touched && nameMissing ? <AppText style={styles.error}>{t('pfNameRequired')}</AppText> : null}
          </Field>
          <Field label={L('mobileNumber')} optional={t('pfOptional')}>
            <TextInput
              accessibilityLabel={t('mobileNumber')}
              value={nf(phone)}
              onChangeText={(text) => setPhone(toAsciiDigits(text).replace(/\D/g, '').slice(0, 11))}
              keyboardType="phone-pad"
              style={styles.input}
            />
          </Field>
          <Field label={L('pfAge')} optional={t('pfOptional')}>
            <TextInput
              accessibilityLabel={t('pfAge')}
              value={nf(age)}
              onChangeText={(text) => setAge(toAsciiDigits(text).replace(/\D/g, '').slice(0, 3))}
              keyboardType="number-pad"
              style={[styles.input, styles.short]}
            />
          </Field>
          <Field label={L('wiReason')} optional={t('pfOptional')}>
            <TextInput
              accessibilityLabel={t('wiReason')}
              value={reason}
              onChangeText={setReason}
              placeholder={t('wiReasonPlaceholder')}
              placeholderTextColor={colors.muted}
              style={styles.input}
            />
          </Field>
        </>
      )}
    </AppScreen>
  );
}

function Field({ label, optional, children }: { label: { en: string; bn: string }; optional?: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <BiText text={label} style={styles.label} />
        {optional ? <AppText style={styles.optional}>{optional}</AppText> : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingTop: 16, gap: 16 },
  field: { gap: 8 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { color: colors.text, fontSize: 13, lineHeight: 20, fontWeight: '700' },
  optional: { color: colors.muted, fontSize: 11 },
  input: {
    minHeight: 50, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
    color: colors.text, paddingHorizontal: 14, fontSize: 16, fontFamily: FONT_FAMILIES.regular,
  },
  short: { maxWidth: 120 },
  inputError: { borderColor: colors.danger },
  error: { color: colors.danger, fontSize: 12, lineHeight: 18 },
  done: { alignItems: 'center', gap: 8, paddingVertical: 28 },
  doneIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  doneTitle: { color: colors.brand, fontSize: 22, lineHeight: 30, fontWeight: '700' },
  hint: { color: colors.muted, fontSize: 13, lineHeight: 20, textAlign: 'center' },
});
