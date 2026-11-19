import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import colors from '../constants/colors';
import { useLanguage } from '../context/LanguageContext';
import type { Localized } from '../services/mock';
import { AppText, BiText, FONT_FAMILIES } from './ui';

/** Rounded selectable pill (gender, blood group, department ...). */
export function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
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

/** Label (Bangla + small English) above any control, with an error line below. */
export function FormField({ label, error = '', children }: { label: Localized; error?: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <BiText text={label} style={styles.label} />
      {children}
      {error ? <AppText style={styles.error}>{error}</AppText> : null}
    </View>
  );
}

type FormInputProps = TextInputProps & { label: Localized; error?: string };

export function FormInput({ label, error = '', style, ...input }: FormInputProps) {
  return (
    <FormField label={label} error={error}>
      <TextInput
        accessibilityLabel={label.en}
        placeholderTextColor={colors.muted}
        style={[styles.input, !!error && styles.inputError, input.multiline && styles.multiline, style]}
        {...input}
      />
    </FormField>
  );
}

/** Password box with a show / hide eye. */
export function PasswordInput({ label, error = '', value, onChangeText, placeholder, onSubmitEditing, returnKeyType }: {
  label: Localized;
  error?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onSubmitEditing?: () => void;
  returnKeyType?: TextInputProps['returnKeyType'];
}) {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);
  return (
    <FormField label={label} error={error}>
      <View style={[styles.passwordBox, !!error && styles.inputError]}>
        <TextInput
          accessibilityLabel={label.en}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          onSubmitEditing={onSubmitEditing}
          returnKeyType={returnKeyType}
          style={styles.passwordInput}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(visible ? 'hidePassword' : 'showPassword')}
          onPress={() => setVisible((v) => !v)}
          hitSlop={8}
          style={styles.eye}
        >
          <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.muted} />
        </Pressable>
      </View>
    </FormField>
  );
}

export const formStyles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  row: { flexDirection: 'row', gap: 12 },
  flex: { flex: 1 },
});

const styles = StyleSheet.create({
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { color: colors.text, fontSize: 13 },
  chipTextActive: { color: colors.surface },
  field: { gap: 6 },
  label: { color: colors.text, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  error: { color: colors.danger, fontSize: 12, lineHeight: 17 },
  input: {
    minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
    paddingHorizontal: 14, color: colors.text, fontSize: 15, fontFamily: FONT_FAMILIES.regular,
  },
  multiline: { minHeight: 84, paddingTop: 12, textAlignVertical: 'top' },
  inputError: { borderColor: colors.danger },
  passwordBox: {
    minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
    flexDirection: 'row', alignItems: 'center', paddingLeft: 14, paddingRight: 10,
  },
  passwordInput: { flex: 1, color: colors.text, fontSize: 15, fontFamily: FONT_FAMILIES.regular, paddingVertical: 10 },
  eye: { padding: 4 },
});
