import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOptionalAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Alpana } from './Alpana';
import colors from '../constants/colors';
import type { Localized } from '../services/mock';

/** Hind Siliguri ships one file per weight, so fontWeight must be mapped to a family. */
export const FONT_FAMILIES = {
  regular: 'HindSiliguri_400Regular',
  medium: 'HindSiliguri_500Medium',
  semibold: 'HindSiliguri_600SemiBold',
  bold: 'HindSiliguri_700Bold',
} as const;

function familyForWeight(weight: TextStyle['fontWeight']): string {
  switch (weight) {
    case 'bold':
    case '700':
    case '800':
    case '900':
      return FONT_FAMILIES.bold;
    case '600':
      return FONT_FAMILIES.semibold;
    case '500':
      return FONT_FAMILIES.medium;
    default:
      return FONT_FAMILIES.regular;
  }
}

export function AppScreen({ children, scroll = true, contentStyle, header, footer, backgroundColor }: {
  children: React.ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  /** Full-bleed block above the scrolling content (see ScreenHeader). */
  header?: React.ReactNode;
  /** Sticky bar below the scrolling content (primary action). */
  footer?: React.ReactNode;
  backgroundColor?: string;
}) {
  return (
    <SafeAreaView style={[styles.safeArea, backgroundColor ? { backgroundColor } : null]} edges={['top']}>
      <View style={styles.bgAlpana}><Alpana size={420} opacity={0.05} /></View>
      {header}
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.screenContent, contentStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : children}
      {footer ? <View style={styles.footerBar}>{footer}</View> : null}
    </SafeAreaView>
  );
}

export function AppText({ children, style, ...props }: React.ComponentProps<typeof Text>) {
  const flat = StyleSheet.flatten(style) ?? {};
  // fontWeight is neutralised: the weight comes from the font family chosen above.
  return (
    <Text {...props} style={[flat, { fontFamily: familyForWeight(flat.fontWeight), fontWeight: 'normal' }]}>
      {children}
    </Text>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/** Highlighted "kantha stitch" card: dashed green border (AI card, live queue, AI summary). */
export function KanthaCard({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, styles.kantha, style]}>{children}</View>;
}

export function ActionButton({ label, onPress, variant = 'primary', disabled = false }: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'danger' && styles.buttonDanger,
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.buttonPressed,
      ]}
    >
      <AppText style={[styles.buttonText, variant === 'secondary' && styles.buttonSecondaryText]}>
        {label}
      </AppText>
    </Pressable>
  );
}

/** Green rounded square + red circle (flag) + white plus. */
export function Logo({ size = 42 }: { size?: number }) {
  const auth = useOptionalAuth();
  const circle = size * 0.62;
  const bar = size * 0.34;
  const thick = Math.max(3, size * 0.09);
  // Hidden demo role switcher: long-press the logo (no visual hint on purpose).
  return (
    <Pressable
      onLongPress={auth?.openSwitcher}
      delayLongPress={600}
      accessible={false}
      style={[styles.logo, { width: size, height: size, borderRadius: size * 0.33 }]}
    >
      <View style={{ width: circle, height: circle, borderRadius: circle / 2, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: bar, height: thick, backgroundColor: colors.surface, borderRadius: thick / 2 }} />
        <View style={{ position: 'absolute', width: thick, height: bar, backgroundColor: colors.surface, borderRadius: thick / 2 }} />
      </View>
    </Pressable>
  );
}

export function BrandHeader({ showLanguage = true }: { showLanguage?: boolean }) {
  const { language, toggleLanguage, t } = useLanguage();
  return (
    <View style={styles.brandHeader}>
      <View style={styles.brand}>
        <Logo />
        <View>
          <AppText style={styles.brandName}>{language === 'bn' ? 'সুস্বাস্থ্য' : 'ShuShastho'}</AppText>
          <AppText style={styles.brandEnglish}>{language === 'bn' ? 'SHUSHASTHO' : 'সুস্বাস্থ্য'}</AppText>
        </View>
      </View>
      {showLanguage && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('switchLanguage')}
          onPress={toggleLanguage}
          style={styles.languageButton}
        >
          <AppText style={styles.languageButtonText}>{language === 'en' ? 'বাং' : 'EN'}</AppText>
        </Pressable>
      )}
    </View>
  );
}

/** Bangla mode: Bangla main line + small grey English line. English mode: English only. */
export function BiText({ text, style, subStyle, hideSub = false }: {
  text: Localized;
  style?: StyleProp<TextStyle>;
  subStyle?: StyleProp<TextStyle>;
  hideSub?: boolean;
}) {
  const { language } = useLanguage();
  return (
    <View>
      <AppText style={style}>{text[language]}</AppText>
      {language === 'bn' && !hideSub ? <AppText style={[styles.biSub, subStyle]}>{text.en}</AppText> : null}
    </View>
  );
}

/** Segmented Bাং / EN switch used in the Figma screen headers. */
export function LanguagePill() {
  const { language, toggleLanguage, t } = useLanguage();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={t('switchLanguage')} onPress={toggleLanguage} style={styles.pill}>
      <View style={[styles.pillHalf, language === 'bn' && styles.pillHalfActive]}>
        <AppText style={[styles.pillText, language === 'bn' && styles.pillTextActive]}>বাং</AppText>
      </View>
      <View style={[styles.pillHalf, language === 'en' && styles.pillHalfActive]}>
        <AppText style={[styles.pillText, language === 'en' && styles.pillTextActive]}>EN</AppText>
      </View>
    </Pressable>
  );
}

/** Mint header with rounded bottom corners: optional back button, title (+English line), language pill. */
export function ScreenHeader({ title, extra, onBack, tone = 'mint', children }: {
  title: Localized;
  /** Extra detail appended to the small subtitle line. */
  extra?: string;
  onBack?: () => void;
  tone?: 'mint' | 'red';
  children?: React.ReactNode;
}) {
  const { language, t } = useLanguage();
  const sub = [language === 'bn' ? title.en : '', extra].filter(Boolean).join(' · ');
  const red = tone === 'red';
  return (
    <View style={[styles.screenHeader, red && styles.screenHeaderRed]}>
      <Alpana size={170} opacity={0.12} color={red ? colors.danger : colors.brand} style={styles.headerAlpana} />
      <View style={styles.screenHeaderRow}>
        {onBack ? (
          <Pressable accessibilityRole="button" accessibilityLabel={t('goBack')} onPress={onBack} hitSlop={8} style={styles.headerBack}>
            <Ionicons name="chevron-back" size={24} color={red ? colors.danger : colors.brand} />
          </Pressable>
        ) : null}
        <View style={styles.flex}>
          <AppText style={[styles.headerTitle, red && { color: colors.danger }]} numberOfLines={2}>{title[language]}</AppText>
          {sub ? <AppText style={styles.headerSub} numberOfLines={1}>{sub}</AppText> : null}
        </View>
        <LanguagePill />
      </View>
      {children}
    </View>
  );
}

export function BackButton({ onPress }: { onPress: () => void }) {
  const { t } = useLanguage();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={t('goBack')} onPress={onPress} hitSlop={8} style={styles.backButton}>
      <Ionicons name="chevron-back" size={26} color={colors.brand} />
    </Pressable>
  );
}

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.pageTitle}>
      <AppText style={styles.title}>{title}</AppText>
      {subtitle ? <AppText style={styles.subtitle}>{subtitle}</AppText> : null}
    </View>
  );
}

export function SectionTitle({ title, action }: { title: string; action?: string }) {
  return (
    <View style={styles.sectionTitle}>
      <AppText style={styles.sectionTitleText}>{title}</AppText>
      {action ? <AppText style={styles.sectionAction}>{action}</AppText> : null}
    </View>
  );
}

export function DemoNotice({ compact = false }: { compact?: boolean }) {
  const { t } = useLanguage();
  return (
    <View style={[styles.demoNotice, compact && styles.demoNoticeCompact]}>
      <View style={styles.demoDot} />
      <AppText style={styles.demoText}>{t('demoData')}</AppText>
    </View>
  );
}

export function Field({ value, onChangeText, placeholder, multiline = false }: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
}) {
  return (
    <TextInput
      accessibilityLabel={placeholder}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.muted}
      multiline={multiline}
      textAlignVertical={multiline ? 'top' : 'center'}
      style={[styles.input, multiline && styles.multilineInput]}
    />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  biSub: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  footerBar: { padding: 16, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', gap: 10 },
  pill: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 20, padding: 3 },
  pillHalf: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 17 },
  pillHalfActive: { backgroundColor: colors.brand },
  pillText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  pillTextActive: { color: colors.surface },
  headerAlpana: { position: 'absolute', top: -46, right: -40 },
  bgAlpana: { position: 'absolute', bottom: -130, left: -130 },
  screenHeader: { overflow: 'hidden', backgroundColor: colors.mint2, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 14, gap: 12 },
  screenHeaderRed: { backgroundColor: colors.redSoft },
  screenHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerBack: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: colors.brand, fontSize: 19, lineHeight: 27, fontWeight: '700' },
  headerSub: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  safeArea: { flex: 1, backgroundColor: colors.canvas, overflow: 'hidden' },
  screenContent: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 28, gap: 18 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  kantha: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.green2 },
  button: {
    minHeight: 48,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSecondary: { backgroundColor: colors.brandSoft },
  buttonDanger: { backgroundColor: colors.danger },
  buttonDisabled: { opacity: 0.6 },
  buttonPressed: { opacity: 0.82 },
  buttonText: { color: colors.surface, fontSize: 15, fontWeight: '700' },
  buttonSecondaryText: { color: colors.brand },
  logo: { backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  brandHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexGrow: 1 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandName: { color: colors.brand, fontSize: 18, lineHeight: 24, fontWeight: '700' },
  brandEnglish: { color: colors.muted, fontSize: 9, letterSpacing: 1.5, fontWeight: '600' },
  languageButton: {
    width: 42, height: 42, borderRadius: 14, borderColor: colors.border, borderWidth: 1,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
  },
  languageButtonText: { color: colors.brand, fontWeight: '700', fontSize: 13 },
  backButton: { width: 34, height: 42, justifyContent: 'center' },
  pageTitle: { gap: 5 },
  title: { color: colors.text, fontSize: 24, lineHeight: 34, fontWeight: '700' },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 22 },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitleText: { color: colors.text, fontSize: 17, lineHeight: 24, fontWeight: '700' },
  sectionAction: { color: colors.brand, fontSize: 13, fontWeight: '700' },
  demoNotice: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9,
    paddingHorizontal: 12, borderRadius: 12, backgroundColor: colors.yellow,
  },
  demoNoticeCompact: { paddingVertical: 7 },
  demoDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.warning },
  demoText: { color: colors.yellowText, fontSize: 11, lineHeight: 16, flexShrink: 1 },
  input: {
    minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface, color: colors.text, paddingHorizontal: 14, fontSize: 15,
    fontFamily: FONT_FAMILIES.regular,
  },
  multilineInput: { minHeight: 96, paddingTop: 12 },
});
