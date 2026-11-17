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
import { useLanguage } from '../context/LanguageContext';
import colors from '../constants/colors';

export function AppScreen({ children, scroll = true, contentStyle }: {
  children: React.ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.screenContent, contentStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : children}
    </SafeAreaView>
  );
}

export function AppText({ children, style, ...props }: React.ComponentProps<typeof Text>) {
  const { language } = useLanguage();
  const font: TextStyle | undefined = language === 'bn' ? { fontFamily: 'PurnoPran' } : undefined;
  return <Text {...props} style={[font, style]}>{children}</Text>;
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
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

export function BrandHeader({ showLanguage = true }: { showLanguage?: boolean }) {
  const { language, toggleLanguage } = useLanguage();
  return (
    <View style={styles.brandHeader}>
      <View style={styles.brand}>
        <View style={styles.brandMark}><AppText style={styles.brandCross}>+</AppText></View>
        <View>
          <AppText style={styles.brandName}>সুস্বাস্থ্য</AppText>
          <AppText style={styles.brandEnglish}>SHUSHASTHO</AppText>
        </View>
      </View>
      {showLanguage && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={language === 'en' ? 'Switch to Bengali' : 'Switch to English'}
          onPress={toggleLanguage}
          style={styles.languageButton}
        >
          <AppText style={styles.languageButtonText}>{language === 'en' ? 'বাং' : 'EN'}</AppText>
        </Pressable>
      )}
    </View>
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
  safeArea: { flex: 1, backgroundColor: colors.canvas },
  screenContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 28, gap: 20 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  button: {
    minHeight: 48,
    paddingHorizontal: 18,
    borderRadius: 14,
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
  brandHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandMark: {
    width: 42, height: 42, borderRadius: 14, backgroundColor: colors.brand,
    alignItems: 'center', justifyContent: 'center',
  },
  brandCross: { color: colors.surface, fontSize: 30, lineHeight: 34, fontWeight: '400' },
  brandName: { color: colors.brand, fontSize: 17, fontWeight: '700' },
  brandEnglish: { color: colors.muted, fontSize: 9, letterSpacing: 1.5, fontWeight: '700' },
  languageButton: {
    width: 42, height: 42, borderRadius: 14, borderColor: colors.border, borderWidth: 1,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
  },
  languageButtonText: { color: colors.brand, fontWeight: '700', fontSize: 13 },
  pageTitle: { gap: 5 },
  title: { color: colors.text, fontSize: 24, lineHeight: 32, fontWeight: '700' },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitleText: { color: colors.text, fontSize: 17, fontWeight: '700' },
  sectionAction: { color: colors.brand, fontSize: 13, fontWeight: '700' },
  demoNotice: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9,
    paddingHorizontal: 12, borderRadius: 12, backgroundColor: '#FFF7E7',
  },
  demoNoticeCompact: { paddingVertical: 7 },
  demoDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.warning },
  demoText: { color: '#765718', fontSize: 11, flexShrink: 1 },
  input: {
    minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface, color: colors.text, paddingHorizontal: 14, fontSize: 15,
  },
  multilineInput: { minHeight: 96, paddingTop: 12 },
});
