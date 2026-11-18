import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppScreen, AppText, BiText, Card, ScreenHeader } from '../components/ui';
import { useLanguage } from '../context/LanguageContext';
import colors from '../constants/colors';
import { sosHospitals } from '../services/mock';
import { call999 } from '../utils/emergency';

const SOS_BACKGROUND = '#FFF6F7';

export default function EmergencyScreen() {
  const { language, t, L, nf } = useLanguage();
  const [error, setError] = useState('');
  const [demoNote, setDemoNote] = useState(false);

  return (
    <AppScreen
      backgroundColor={SOS_BACKGROUND}
      header={<ScreenHeader tone="red" title={L('sos')} onBack={() => router.back()} />}
      contentStyle={styles.content}
    >
      {/* Big 999 button first. Dials immediately: no confirmation step may delay a 999 call. */}
      <View style={styles.hero}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('call999')}
          onPress={() => call999(() => setError(t('callUnavailable')))}
          style={({ pressed }) => [styles.bigButton, pressed && { opacity: 0.88 }]}
        >
          <Ionicons name="call-outline" size={34} color={colors.surface} />
          <AppText style={styles.bigNumber}>{nf(999)}</AppText>
          <AppText style={styles.bigLabel}>{language === 'bn' ? 'কল করুন · Call' : 'Call'}</AppText>
        </Pressable>
        <BiText text={L('nationalService')} style={styles.national} subStyle={styles.nationalSub} />
      </View>
      {error ? <Card style={styles.error}><AppText style={styles.errorText}>{error}</AppText></Card> : null}

      <Card style={styles.card}>
        <View style={styles.locRow}>
          <Ionicons name="location-outline" size={20} color={colors.brand} />
          <View style={styles.flex}>
            <BiText text={L('locationSharing')} style={styles.locTitle} />
          </View>
        </View>
        <View style={styles.chips}>
          {(['contactSon', 'contactWife'] as const).map((key) => (
            <View key={key} style={styles.chip}>
              <Ionicons name="checkmark" size={14} color={colors.brand} />
              <AppText style={styles.chipText}>{t(key)}</AppText>
            </View>
          ))}
        </View>
        <AppText style={styles.demoText}>{t('locationDemo')}</AppText>
      </Card>

      <Card style={styles.card}>
        <BiText text={L('nearestEmergency')} style={styles.nearTitle} />
        {sosHospitals.map((hospital, index) => (
          <View key={hospital.id} style={[styles.hospital, index > 0 && styles.hospitalDivider]}>
            <View style={styles.hospitalIcon}><Ionicons name="medkit-outline" size={18} color={colors.danger} /></View>
            <View style={styles.flex}>
              <BiText text={L(hospital.nameKey)} style={styles.hospitalName} subStyle={styles.hospitalSub} />
              <AppText style={styles.hospitalMeta}>{t(hospital.metaKey)}</AppText>
            </View>
            {/* Hospital numbers are fictional in the demo, so this does not dial. */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${t('callLabel')} ${t(hospital.nameKey)}`}
              onPress={() => setDemoNote(true)}
              style={styles.callButton}
            >
              <Ionicons name="call" size={18} color={colors.surface} />
            </Pressable>
          </View>
        ))}
        {demoNote ? <AppText style={styles.demoText}>{t('hospitalCallDemo')}</AppText> : null}
      </Card>

      <Card style={styles.medicalId}>
        <Ionicons name="heart-outline" size={22} color={colors.danger} />
        <View style={styles.flex}>
          <AppText style={styles.medicalLine}>{t('medicalId')}: {t('medicalIdLine')}</AppText>
          <AppText style={styles.hospitalMeta}>{t('medicalIdShown')}</AppText>
        </View>
      </Card>

      <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.safe}>
        <BiText text={L('imSafe')} style={styles.safeText} subStyle={styles.safeSub} />
      </Pressable>
      <AppText style={styles.footer}>{t('noAutomaticAction')}</AppText>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { gap: 14, paddingTop: 16 },
  hero: { alignItems: 'center', gap: 14 },
  bigButton: {
    width: 160, height: 160, borderRadius: 80, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.danger, shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 8,
  },
  bigNumber: { color: colors.surface, fontSize: 44, lineHeight: 56, fontWeight: '700' },
  bigLabel: { color: colors.surface, fontSize: 13, fontWeight: '600' },
  national: { color: colors.danger, fontSize: 14, lineHeight: 21, fontWeight: '600', textAlign: 'center' },
  nationalSub: { textAlign: 'center' },
  card: { gap: 10 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  locTitle: { color: colors.brand, fontSize: 14, lineHeight: 21, fontWeight: '700' },
  chips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.mint2, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { color: colors.brand, fontSize: 12, fontWeight: '600' },
  demoText: { color: colors.yellowText, backgroundColor: colors.yellow, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 11, lineHeight: 16 },
  nearTitle: { color: colors.muted, fontSize: 13, lineHeight: 20, fontWeight: '600' },
  hospital: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  hospitalDivider: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
  hospitalIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.redSoft, alignItems: 'center', justifyContent: 'center' },
  hospitalName: { color: colors.text, fontSize: 14, lineHeight: 21, fontWeight: '700' },
  hospitalSub: { fontSize: 11 },
  hospitalMeta: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  callButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  medicalId: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  medicalLine: { color: colors.text, fontSize: 13, lineHeight: 20, fontWeight: '600' },
  safe: { minHeight: 52, borderRadius: 12, borderWidth: 1.5, borderColor: colors.muted, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  safeText: { color: colors.text, fontSize: 15, lineHeight: 22, fontWeight: '700', textAlign: 'center' },
  safeSub: { textAlign: 'center' },
  footer: { color: colors.muted, textAlign: 'center', fontSize: 11, lineHeight: 17 },
  error: { borderColor: colors.yellow, backgroundColor: colors.yellow },
  errorText: { color: colors.yellowText, fontSize: 13 },
});
