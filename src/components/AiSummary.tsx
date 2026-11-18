import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import colors from '../constants/colors';
import { useLanguage } from '../context/LanguageContext';
import type { Localized } from '../services/mock';
import { AppText } from './ui';

/**
 * AI pre-visit summary for the doctor. Wording stays "possible conditions to consider" — never a diagnosis —
 * and always carries the "not a substitute for a doctor" line.
 */
export function AiSummary({ summary }: { summary: Localized }) {
  const { t, L, language } = useLanguage();
  const note = L('aiDisclaimer');
  return (
    <View style={styles.box}>
      <View style={styles.head}>
        <Ionicons name="sparkles" size={15} color={colors.brand} />
        <AppText style={styles.title}>{t('aiPreVisit')}</AppText>
      </View>
      <AppText style={styles.text}>{summary[language]}</AppText>
      <AppText style={styles.note}>{language === 'bn' ? `${note.bn} · ${note.en}` : note.en}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: colors.mint, borderRadius: 12, padding: 12, gap: 4 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { color: colors.brand, fontSize: 12, fontWeight: '700' },
  text: { color: colors.text, fontSize: 13, lineHeight: 20 },
  note: { color: colors.muted, fontSize: 10, lineHeight: 15 },
});
