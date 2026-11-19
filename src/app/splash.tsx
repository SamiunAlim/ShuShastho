import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Alpana } from '../components/Alpana';
import { ActionButton, AppScreen, AppText, BiText, Logo } from '../components/ui';
import colors from '../constants/colors';
import type { Language } from '../constants/i18n';
import { useLanguage } from '../context/LanguageContext';

/** Language names are shown in their own script, so they are not translated. */
const LANGUAGE_CARDS: { code: Language; name: string; sub: string }[] = [
  { code: 'bn', name: 'বাংলা', sub: 'Bangla' },
  { code: 'en', name: 'English', sub: 'ইংরেজি' },
];

export default function SplashScreen() {
  const { language, setLanguage, t, L } = useLanguage();

  return (
    <AppScreen contentStyle={styles.content}>
      <View style={styles.bigAlpana}><Alpana size={380} opacity={0.1} /></View>

      <View style={styles.brandBlock}>
        <View style={styles.brandRow}>
          <Logo size={64} />
          <View>
            <AppText style={styles.wordmark}>{language === 'bn' ? 'সুস্বাস্থ্য' : 'ShuShastho'}</AppText>
            {language === 'bn' ? <AppText style={styles.wordmarkSub}>ShuShastho</AppText> : null}
          </View>
        </View>
        <BiText text={L('tagline')} style={styles.tagline} subStyle={styles.centerSub} />
      </View>

      <View style={styles.chooser}>
        <BiText text={L('chooseLanguage')} style={styles.chooseLabel} subStyle={styles.centerSub} />
        <View style={styles.cards}>
          {LANGUAGE_CARDS.map((card) => {
            const selected = language === card.code;
            return (
              <Pressable
                key={card.code}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`${card.name} (${card.sub})`}
                onPress={() => setLanguage(card.code)}
                style={({ pressed }) => [styles.card, selected && styles.cardSelected, pressed && styles.pressed]}
              >
                <AppText style={[styles.cardName, selected && styles.cardNameSelected]}>{card.name}</AppText>
                <AppText style={styles.cardSub}>{card.sub}</AppText>
                {selected ? (
                  <View style={styles.selectedChip}>
                    <Ionicons name="checkmark" size={13} color={colors.surface} />
                    <AppText style={styles.selectedText}>{t('optionSelected')}</AppText>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
        <BiText text={L('changeLaterInSettings')} style={styles.changeLater} subStyle={styles.centerSub} />
      </View>

      <View style={styles.actions}>
        <ActionButton label={t('logIn')} onPress={() => router.push('/login')} />
        <ActionButton label={t('createAccount')} onPress={() => router.push('/signup')} variant="secondary" />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  actions: { gap: 12 },
  content: { flexGrow: 1, justifyContent: 'center', gap: 28, paddingBottom: 12 },
  bigAlpana: { position: 'absolute', top: 30, alignSelf: 'center' },
  brandBlock: { alignItems: 'center', gap: 14 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  wordmark: { color: colors.brand, fontSize: 34, lineHeight: 46, fontWeight: '700' },
  wordmarkSub: { color: colors.muted, fontSize: 15, lineHeight: 20, fontWeight: '600' },
  tagline: { color: colors.text, fontSize: 17, lineHeight: 26, fontWeight: '600', textAlign: 'center' },
  centerSub: { textAlign: 'center' },
  chooser: { gap: 14 },
  chooseLabel: { color: colors.text, fontSize: 14, lineHeight: 22, fontWeight: '600', textAlign: 'center' },
  cards: { flexDirection: 'row', gap: 12 },
  card: {
    flex: 1, minHeight: 112, borderRadius: 16, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', gap: 2, padding: 12,
  },
  cardSelected: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.green2, backgroundColor: colors.mint2 },
  pressed: { opacity: 0.85 },
  cardName: { color: colors.text, fontSize: 22, lineHeight: 32, fontWeight: '700' },
  cardNameSelected: { color: colors.brand },
  cardSub: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  selectedChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, paddingHorizontal: 12,
    paddingVertical: 4, borderRadius: 20, backgroundColor: colors.brand,
  },
  selectedText: { color: colors.surface, fontSize: 12, fontWeight: '600' },
  changeLater: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: 'center' },
});
