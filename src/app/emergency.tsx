import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, View } from 'react-native';
import { ActionButton, AppScreen, AppText, BrandHeader, Card, PageTitle } from '../components/ui';
import { useLanguage } from '../context/LanguageContext';
import colors from '../constants/colors';

export default function EmergencyScreen() {
  const { t } = useLanguage();
  const [error, setError] = useState('');

  function callEmergencyServices() {
    Alert.alert(t('call999'), t('emergencyNotice'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('call999'),
        style: 'destructive',
        onPress: () => {
          Linking.openURL('tel:999').catch(() => setError('Phone calls are not available on this device. Call 999 directly.'));
        },
      },
    ]);
  }

  return (
    <AppScreen>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={() => router.back()}><AppText style={styles.back}>‹</AppText></Pressable>
        <BrandHeader />
      </View>
      <View style={styles.hero}>
        <View style={styles.emergencyIcon}><AppText style={styles.exclamation}>!</AppText></View>
        <PageTitle title={t('sos')} subtitle={t('emergencyNotice')} />
      </View>
      <ActionButton label={t('call999')} onPress={callEmergencyServices} variant="danger" />
      {error ? <Card style={styles.error}><AppText style={styles.errorText}>{error}</AppText></Card> : null}
      <Card style={styles.medicalId}>
        <AppText style={styles.medicalTitle}>{t('medicalId')} · Demo</AppText>
        <View style={styles.row}><AppText style={styles.label}>{t('bloodGroup')}</AppText><AppText style={styles.value}>{t('notProvided')}</AppText></View>
        <View style={styles.row}><AppText style={styles.label}>{t('allergies')}</AppText><AppText style={styles.value}>{t('notProvided')}</AppText></View>
        <View style={styles.row}><AppText style={styles.label}>{t('emergencyContact')}</AppText><AppText style={styles.value}>{t('notProvided')}</AppText></View>
      </Card>
      <AppText style={styles.footer}>{t('noAutomaticAction')}</AppText>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  back: { color: colors.brand, fontSize: 32, paddingRight: 4 },
  hero: { alignItems: 'center', gap: 18, paddingVertical: 18 },
  emergencyIcon: { width: 72, height: 72, backgroundColor: '#FCE4E5', borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  exclamation: { color: colors.danger, fontSize: 42, fontWeight: '800' },
  medicalId: { gap: 14 },
  medicalTitle: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  label: { color: colors.muted, fontSize: 12 },
  value: { color: colors.text, fontSize: 12, fontWeight: '600' },
  footer: { color: colors.muted, textAlign: 'center', fontSize: 11, lineHeight: 17 },
  error: { borderColor: '#F4E6C7', backgroundColor: '#FFF7E7' },
  errorText: { color: '#765718', fontSize: 12 },
});
