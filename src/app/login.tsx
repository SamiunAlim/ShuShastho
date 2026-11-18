import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Alpana } from '../components/Alpana';
import { ActionButton, AppScreen, AppText, BiText, FONT_FAMILIES, LanguagePill, Logo } from '../components/ui';
import colors from '../constants/colors';
import { ROLE_META, STAFF_ROLES } from '../constants/roles';
import type { Role } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { DEMO_STAFF } from '../services/mock';
import { call999 } from '../utils/emergency';
import { toAsciiDigits } from '../utils/format';

type Tab = 'patient' | 'staff';

/** Mock login: any phone number (6+ digits) is accepted. */
const MIN_PHONE_DIGITS = 6;

export default function LoginScreen() {
  const { language, t, L, nf } = useLanguage();
  const [tab, setTab] = useState<Tab>('patient');
  const [staffRole, setStaffRole] = useState<Role>('doctor');
  const [phone, setPhone] = useState(DEMO_STAFF.phone);
  const [touched, setTouched] = useState(false);
  const [callError, setCallError] = useState(false);

  const valid = phone.length >= MIN_PHONE_DIGITS;
  const role: Role = tab === 'patient' ? 'patient' : staffRole;

  const sendOtp = () => {
    setTouched(true);
    if (!valid) return;
    router.push({ pathname: '/otp', params: { phone, role } });
  };

  return (
    <AppScreen contentStyle={styles.content}>
      <View style={styles.alpana}><Alpana size={190} opacity={0.12} /></View>

      <View style={styles.topRow}>
        <View style={styles.brand}>
          <Logo />
          <View>
            <AppText style={styles.brandName}>{language === 'bn' ? 'সুস্বাস্থ্য' : 'ShuShastho'}</AppText>
            {language === 'bn' ? <AppText style={styles.brandSub}>ShuShastho</AppText> : null}
          </View>
        </View>
        <LanguagePill />
      </View>

      <BiText text={L('loginWelcome')} style={styles.heading} subStyle={styles.headingSub} />

      <View style={styles.tabs} accessibilityRole="tablist">
        {(['patient', 'staff'] as const).map((key) => {
          const active = tab === key;
          return (
            <Pressable
              key={key}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => setTab(key)}
              style={[styles.tab, active && styles.tabActive]}
            >
              <Ionicons name={key === 'patient' ? 'person-outline' : 'medkit-outline'} size={20} color={active ? colors.brand : colors.muted} />
              <BiText
                text={L(key === 'patient' ? 'loginTabPatient' : 'loginTabStaff')}
                style={[styles.tabText, active && styles.tabTextActive]}
                subStyle={styles.tabSub}
              />
            </Pressable>
          );
        })}
      </View>

      {tab === 'staff' ? (
        <View style={styles.block}>
          <BiText text={L('yourRole')} style={styles.label} />
          <View style={styles.roleRow}>
            {STAFF_ROLES.map((key) => {
              const active = staffRole === key;
              return (
                <Pressable
                  key={key}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  onPress={() => setStaffRole(key)}
                  style={[styles.roleChip, active && styles.roleChipActive]}
                >
                  <Ionicons name={ROLE_META[key].icon} size={18} color={active ? colors.surface : colors.brand} />
                  <AppText style={[styles.roleChipText, active && styles.roleChipTextActive]} numberOfLines={1}>
                    {t(ROLE_META[key].label)}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      <View style={styles.block}>
        <BiText text={L('mobileNumber')} style={styles.label} />
        <View style={[styles.phoneBox, touched && !valid && styles.phoneBoxError]}>
          <View style={styles.prefix}><AppText style={styles.prefixText}>+{nf(880)}</AppText></View>
          <TextInput
            accessibilityLabel={t('mobileNumber')}
            value={phone}
            onChangeText={(text) => setPhone(toAsciiDigits(text).replace(/\D/g, '').slice(0, 11))}
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            autoComplete="tel"
            maxLength={11}
            onSubmitEditing={sendOtp}
            returnKeyType="go"
            style={styles.phoneInput}
          />
        </View>
        {touched && !valid ? <AppText style={styles.error}>{t('phoneInvalid')}</AppText> : null}
      </View>

      <ActionButton label={language === 'bn' ? `${t('sendOtp')} · ${L('sendOtp').en}` : t('sendOtp')} onPress={sendOtp} />

      <View style={styles.infoCard}>
        <Ionicons name="shield-checkmark-outline" size={22} color={colors.blueText} />
        <View style={styles.flex}>
          <AppText style={styles.infoTitle}>{t(tab === 'patient' ? 'noPasswordNeeded' : 'staffApprovalNote')}</AppText>
          {language === 'bn' ? (
            <AppText style={styles.infoSub}>
              {L(tab === 'patient' ? 'noPasswordNeeded' : 'staffApprovalNote').en}
            </AppText>
          ) : null}
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('call999')}
        onPress={() => call999(() => setCallError(true))}
        style={({ pressed }) => [styles.sosCard, pressed && styles.pressed]}
      >
        <Ionicons name="call-outline" size={22} color={colors.danger} />
        <View style={styles.flex}>
          <AppText style={styles.sosTitle}>{t('emergencyNoLogin')}</AppText>
          {language === 'bn' ? <AppText style={styles.sosSub}>{L('emergencyNoLogin').en}</AppText> : null}
          {callError ? <AppText style={styles.sosSub}>{t('callUnavailable')}</AppText> : null}
        </View>
      </Pressable>

      <BiText text={L('termsNotice')} style={styles.terms} subStyle={styles.termsSub} />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingTop: 14, gap: 16 },
  alpana: { position: 'absolute', top: -40, right: -50 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandName: { color: colors.brand, fontSize: 18, lineHeight: 24, fontWeight: '700' },
  brandSub: { color: colors.muted, fontSize: 11, lineHeight: 15 },
  heading: { color: colors.brand, fontSize: 28, lineHeight: 40, fontWeight: '700' },
  headingSub: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  tabs: { flexDirection: 'row', backgroundColor: colors.mint2, borderRadius: 18, padding: 4, gap: 4 },
  tab: { flex: 1, minHeight: 56, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 8 },
  tabActive: { backgroundColor: colors.surface },
  tabText: { color: colors.muted, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  tabTextActive: { color: colors.brand },
  tabSub: { fontSize: 10, lineHeight: 14 },
  block: { gap: 8 },
  label: { color: colors.text, fontSize: 13, lineHeight: 20, fontWeight: '700' },
  roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleChip: {
    flexGrow: 1, flexBasis: '30%', minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 6,
  },
  roleChipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  roleChipText: { color: colors.brand, fontSize: 12, fontWeight: '600', flexShrink: 1 },
  roleChipTextActive: { color: colors.surface },
  phoneBox: {
    minHeight: 56, borderRadius: 14, borderWidth: 1.5, borderColor: colors.brand, backgroundColor: colors.surface,
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10,
  },
  phoneBoxError: { borderColor: colors.danger },
  prefix: { backgroundColor: colors.mint2, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  prefixText: { color: colors.brand, fontSize: 15, fontWeight: '700' },
  phoneInput: { flex: 1, color: colors.text, fontSize: 17, fontFamily: FONT_FAMILIES.medium, paddingVertical: 8 },
  error: { color: colors.danger, fontSize: 12, lineHeight: 18 },
  infoCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, backgroundColor: colors.blue },
  infoTitle: { color: colors.blueText, fontSize: 13, lineHeight: 20, fontWeight: '600' },
  infoSub: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  sosCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, backgroundColor: colors.redSoft },
  sosTitle: { color: colors.danger, fontSize: 13, lineHeight: 20, fontWeight: '700' },
  sosSub: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  pressed: { opacity: 0.85 },
  terms: { color: colors.muted, fontSize: 11, lineHeight: 17, textAlign: 'center' },
  termsSub: { textAlign: 'center' },
});
