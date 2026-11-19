import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import colors from '../constants/colors';
import { useLanguage } from '../context/LanguageContext';
import type { Localized } from '../services/mock';
import { AppText, BiText } from './ui';

/** Numbered steps joined by a line: done = green tick, current = green ring, upcoming = grey. */
export function StepIndicator({ steps, current }: { steps: Localized[]; current: number }) {
  const { tf, nf } = useLanguage();
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {steps.map((step, index) => {
          const done = index < current;
          const active = index === current;
          return (
            <React.Fragment key={step.en}>
              {index > 0 ? <View style={[styles.line, index <= current && styles.lineDone]} /> : null}
              <View style={[styles.dot, done && styles.dotDone, active && styles.dotActive]}>
                {done ? (
                  <Ionicons name="checkmark" size={14} color={colors.surface} />
                ) : (
                  <AppText style={[styles.number, active && styles.numberActive]}>{nf(index + 1)}</AppText>
                )}
              </View>
            </React.Fragment>
          );
        })}
      </View>
      <View style={styles.caption}>
        <AppText style={styles.step}>{tf('bkStepOf', { n: current + 1, total: steps.length })}</AppText>
        <BiText text={steps[current]} style={styles.title} subStyle={styles.sub} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center' },
  line: { flex: 1, height: 2, backgroundColor: colors.border },
  lineDone: { backgroundColor: colors.brand },
  dot: {
    width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: colors.border,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
  },
  dotDone: { backgroundColor: colors.brand, borderColor: colors.brand },
  dotActive: { borderColor: colors.brand, backgroundColor: colors.mint3 },
  number: { color: colors.muted, fontSize: 12, lineHeight: 18, fontWeight: '600' },
  numberActive: { color: colors.brand },
  caption: { flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' },
  step: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  title: { color: colors.brand, fontSize: 15, lineHeight: 22, fontWeight: '700' },
  sub: { fontSize: 10, lineHeight: 14 },
});
