import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import colors from '../constants/colors';
import { useLanguage } from '../context/LanguageContext';
import { toAsciiDigits } from '../utils/format';
import { AppText, FONT_FAMILIES } from './ui';

export const OTP_LENGTH = 6;
export { DEMO_OTP } from '../services/mock';

/** Six boxes over one invisible input: tapping a box focuses it. */
export function OtpInput({ value, onChange, label, error = false }: {
  value: string;
  onChange: (code: string) => void;
  label: string;
  error?: boolean;
}) {
  const { nf } = useLanguage();
  const complete = value.length === OTP_LENGTH;
  return (
    <View style={styles.boxes}>
      {Array.from({ length: OTP_LENGTH }, (_, i) => {
        const filled = i < value.length;
        const active = i === Math.min(value.length, OTP_LENGTH - 1) && !complete;
        return (
          <View key={i} style={[styles.box, filled && styles.boxFilled, active && styles.boxActive, error && styles.boxError]}>
            <AppText style={styles.boxText}>{filled ? nf(value[i]) : ''}</AppText>
          </View>
        );
      })}
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={(text) => onChange(toAsciiDigits(text).replace(/\D/g, '').slice(0, OTP_LENGTH))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={OTP_LENGTH}
        autoFocus
        caretHidden
        style={styles.hiddenInput}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  boxes: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  box: {
    flex: 1, maxWidth: 52, aspectRatio: 0.9, borderRadius: 12, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
  },
  boxFilled: { borderWidth: 1.5, borderColor: colors.brand },
  boxActive: { borderWidth: 2, borderColor: colors.brand },
  boxError: { borderColor: colors.danger },
  boxText: { color: colors.text, fontSize: 24, lineHeight: 34, fontWeight: '700' },
  hiddenInput: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, opacity: 0.02, color: 'transparent', fontFamily: FONT_FAMILIES.regular },
});
