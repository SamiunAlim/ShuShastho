import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import colors from '../constants/colors';
import { useLanguage } from '../context/LanguageContext';
import { toAsciiDigits } from '../utils/format';
import { FONT_FAMILIES } from './ui';

export const PIN_LENGTH = 4;

/** Four boxes over one invisible input (same pattern as the OTP boxes). Digits show as dots. */
export function PinInput({ value, onChange, error = false, label, autoFocus = true }: {
  value: string;
  onChange: (pin: string) => void;
  error?: boolean;
  label: string;
  autoFocus?: boolean;
}) {
  const { nf } = useLanguage();
  const complete = value.length === PIN_LENGTH;
  return (
    <View style={styles.boxes}>
      {Array.from({ length: PIN_LENGTH }, (_, i) => {
        const filled = i < value.length;
        const active = i === Math.min(value.length, PIN_LENGTH - 1) && !complete;
        return (
          <View key={i} style={[styles.box, filled && styles.boxFilled, active && styles.boxActive, error && styles.boxError]}>
            {filled ? <View style={styles.dot} /> : null}
          </View>
        );
      })}
      <TextInput
        accessibilityLabel={label}
        value={nf(value)}
        onChangeText={(text) => onChange(toAsciiDigits(text).replace(/\D/g, '').slice(0, PIN_LENGTH))}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={PIN_LENGTH}
        autoFocus={autoFocus}
        caretHidden
        style={styles.hiddenInput}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  boxes: { flexDirection: 'row', justifyContent: 'center', gap: 12 },
  box: {
    width: 56, height: 64, borderRadius: 14, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
  },
  boxFilled: { borderWidth: 1.5, borderColor: colors.brand },
  boxActive: { borderWidth: 2, borderColor: colors.brand },
  boxError: { borderColor: colors.danger },
  dot: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.brand },
  hiddenInput: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, opacity: 0.02, color: 'transparent', fontFamily: FONT_FAMILIES.regular },
});
