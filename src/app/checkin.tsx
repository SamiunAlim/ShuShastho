import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ActionButton, AppScreen, AppText, BiText, Card, DemoNotice, ScreenHeader } from '../components/ui';
import { useJourney } from '../context/JourneyContext';
import { useLanguage } from '../context/LanguageContext';
import colors from '../constants/colors';
import type { TranslationKey } from '../constants/i18n';
import { CHECKIN, checkinSymptoms } from '../services/mock';
import { call999 } from '../utils/emergency';
import { goBack } from '../utils/navigation';

type Mood = 'better' | 'same' | 'worse';

const MOODS: { id: Mood; key: TranslationKey; bg: string; fg: string; border: string }[] = [
  { id: 'better', key: 'moodBetter', bg: colors.mint2, fg: colors.brand, border: colors.green2 },
  { id: 'same', key: 'moodSame', bg: colors.blue, fg: colors.blueText, border: colors.blueText },
  { id: 'worse', key: 'moodWorse', bg: colors.redSoft, fg: colors.danger, border: colors.danger },
];

export default function CheckInScreen() {
  const { language, t, L, nf } = useLanguage();
  const journey = useJourney();
  const [mood, setMood] = useState<Mood>('same');
  const [temp, setTemp] = useState(CHECKIN.defaultTempF);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [tookMeds, setTookMeds] = useState(true);
  const [callError, setCallError] = useState(false);

  // Any dengue warning symptom, or a very high fever, is a red flag.
  const redFlag = Object.values(checked).some(Boolean) || temp >= CHECKIN.redFlagTempF;

  function submit() {
    journey.completeCheckIn();
    router.navigate('/(tabs)/records');
  }

  return (
    <AppScreen
      header={
        <ScreenHeader
          title={L('ciTitle')}
          extra={L('ciExtra', { n: CHECKIN.day, total: CHECKIN.totalDays }).en}
          onBack={() => goBack('/(tabs)/records')}
        />
      }
      footer={<View style={styles.flex}><ActionButton label={t('submit')} onPress={submit} /></View>}
    >
      <DemoNotice compact />
      <BiText
        text={L('ciHow', { name: L('ciName') })}
        style={styles.question}
      />

      <View style={styles.moods}>
        {MOODS.map((item) => {
          const active = mood === item.id;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              onPress={() => setMood(item.id)}
              style={[styles.mood, { backgroundColor: item.bg }, active && { borderColor: item.border, borderWidth: 2 }]}
            >
              <AppText style={[styles.moodMain, { color: item.fg }]}>{t(item.key)}</AppText>
              {language === 'bn' ? <AppText style={styles.moodSub}>{L(item.key).en}</AppText> : null}
            </Pressable>
          );
        })}
      </View>

      <Card style={styles.tempCard}>
        <Ionicons name="heart-outline" size={22} color={colors.muted} />
        <View style={styles.flex}>
          <BiText text={L('ciTemp')} style={styles.tempLabel} />
        </View>
        <Stepper
          label={t('decrease')}
          icon="remove"
          onPress={() => setTemp((v) => Math.max(CHECKIN.minTempF, v - 0.5))}
        />
        <AppText style={[styles.tempValue, temp >= CHECKIN.redFlagTempF && { color: colors.danger }]}>{nf(temp.toFixed(1))}°F</AppText>
        <Stepper
          label={t('increase')}
          icon="add"
          onPress={() => setTemp((v) => Math.min(CHECKIN.maxTempF, v + 0.5))}
        />
      </Card>

      <Card style={styles.symptoms}>
        <BiText text={L('ciSymptoms')} style={styles.symptomsTitle} />
        {checkinSymptoms.map((symptom) => {
          const on = Boolean(checked[symptom.id]);
          return (
            <Pressable
              key={symptom.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              onPress={() => setChecked((c) => ({ ...c, [symptom.id]: !c[symptom.id] }))}
              style={styles.symptomRow}
            >
              <View style={[styles.box, on && styles.boxOn]}>
                {on ? <Ionicons name="checkmark" size={16} color={colors.surface} /> : null}
              </View>
              <BiText text={L(symptom.labelKey)} style={styles.symptomLabel} />
            </Pressable>
          );
        })}
      </Card>

      <View style={styles.medsRow}>
        <View style={styles.flex}><BiText text={L('ciMeds')} style={styles.medsLabel} /></View>
        {([true, false] as const).map((value) => {
          const active = tookMeds === value;
          return (
            <Pressable
              key={String(value)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              onPress={() => setTookMeds(value)}
              style={[styles.yesNo, active && styles.yesNoActive]}
            >
              <AppText style={[styles.yesNoText, active && { color: colors.surface }]}>{value ? t('yes') : t('no')}</AppText>
            </Pressable>
          );
        })}
      </View>

      {redFlag ? (
        <View style={styles.alert} accessibilityLiveRegion="polite">
          <View style={styles.alertHead}>
            <Ionicons name="warning-outline" size={20} color={colors.danger} />
            <View style={styles.flex}>
              <BiText text={L('ciAlertTitle')} style={styles.alertTitle} subStyle={styles.alertTitleSub} />
            </View>
          </View>
          <BiText text={L('ciAlertBody')} style={styles.alertBody} />
          <View style={styles.alertButtons}>
            <View style={styles.flex}><ActionButton label={L('bookToday')[language] + (language === 'bn' ? ' · Book today' : '')} onPress={() => router.push('/booking')} /></View>
            {/* Dials immediately: nothing may delay a 999 call. */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('call999')}
              onPress={() => call999(() => setCallError(true), { message: 'Recovery check-in: red-flag symptoms', source: 'checkin' })}
              style={styles.sosButton}
            >
              <Ionicons name="call" size={18} color={colors.surface} />
              <AppText style={styles.sosText}>{nf(999)}</AppText>
            </Pressable>
          </View>
          {callError ? <AppText style={styles.alertBody}>{t('callUnavailable')}</AppText> : null}
        </View>
      ) : null}
    </AppScreen>
  );
}

function Stepper({ label, icon, onPress }: { label: string; icon: 'add' | 'remove'; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={6} style={styles.stepper}>
      <Ionicons name={icon} size={18} color={colors.brand} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  question: { color: colors.brand, fontSize: 19, lineHeight: 28, fontWeight: '700' },
  moods: { flexDirection: 'row', gap: 10 },
  mood: { flex: 1, borderRadius: 14, borderWidth: 2, borderColor: 'transparent', alignItems: 'center', paddingVertical: 14, gap: 2 },
  moodMain: { fontSize: 16, lineHeight: 24, fontWeight: '700' },
  moodSub: { color: colors.muted, fontSize: 11 },
  tempCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  tempLabel: { color: colors.text, fontSize: 14, lineHeight: 21, fontWeight: '600' },
  tempValue: { color: colors.brand, fontSize: 18, fontWeight: '700', minWidth: 70, textAlign: 'center' },
  stepper: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.mint2, alignItems: 'center', justifyContent: 'center' },
  symptoms: { gap: 14 },
  symptomsTitle: { color: colors.text, fontSize: 13, lineHeight: 20, fontWeight: '600' },
  symptomRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  box: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  boxOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  symptomLabel: { color: colors.text, fontSize: 15, lineHeight: 22, fontWeight: '600' },
  medsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  medsLabel: { color: colors.text, fontSize: 13, lineHeight: 20, fontWeight: '600' },
  yesNo: { borderRadius: 20, borderWidth: 1.5, borderColor: colors.brand, paddingHorizontal: 16, paddingVertical: 6 },
  yesNoActive: { backgroundColor: colors.brand },
  yesNoText: { color: colors.brand, fontSize: 13, fontWeight: '700' },
  alert: { backgroundColor: colors.redSoft, borderColor: colors.danger, borderWidth: 1.5, borderRadius: 16, padding: 14, gap: 10 },
  alertHead: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  alertTitle: { color: colors.danger, fontSize: 14, lineHeight: 21, fontWeight: '700' },
  alertTitleSub: { color: colors.danger },
  alertBody: { color: colors.text, fontSize: 13, lineHeight: 20 },
  alertButtons: { flexDirection: 'row', gap: 10 },
  sosButton: { minHeight: 48, minWidth: 84, borderRadius: 12, backgroundColor: colors.danger, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 14 },
  sosText: { color: colors.surface, fontSize: 16, fontWeight: '700' },
});
