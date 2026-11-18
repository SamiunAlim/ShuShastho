import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { AiSummary } from '../../components/AiSummary';
import { ActionButton, AppScreen, AppText, BiText, FONT_FAMILIES, KanthaCard, ScreenHeader } from '../../components/ui';
import colors from '../../constants/colors';
import { useDesk } from '../../context/DeskContext';
import { useJourney } from '../../context/JourneyContext';
import { useLanguage } from '../../context/LanguageContext';
import { DEMO, prescription } from '../../services/mock';

const TEST_OPTIONS = ['CBC', 'NS1', 'Urine R/E'] as const;

/**
 * Consultation + e-prescription. For the demo patient (serial #17) "Send & finish" stores the selected
 * Rx in JourneyContext, so it appears on the patient's side; other patients are just marked done.
 */
export default function ConsultScreen() {
  const { t, tf, L, nf, language } = useLanguage();
  const desk = useDesk();
  const journey = useJourney();
  const params = useLocalSearchParams<{ serial?: string }>();
  const patient = desk.patients.find((p) => String(p.serial) === params.serial);
  const isDemoPatient = patient?.serial === DEMO.serial;

  const [medicineIds, setMedicineIds] = useState<string[]>(prescription.medicines.map((m) => m.id));
  const [tests, setTests] = useState<string[]>([...prescription.tests]);
  const [diagnosis, setDiagnosis] = useState('');
  const [sent, setSent] = useState(false);

  const toggle = (list: string[], value: string) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  const hasContent = isDemoPatient ? medicineIds.length + tests.length > 0 : true;

  const sendAndFinish = () => {
    if (!patient || !hasContent) return;
    if (isDemoPatient) journey.sendPrescription({ medicineIds, tests });
    desk.finishVisit(patient.serial);
    setSent(true);
  };

  if (!patient) {
    return (
      <AppScreen header={<ScreenHeader title={L('csTitle')} onBack={() => router.back()} />}>
        <AppText style={styles.meta}>{t('csNoPatient')}</AppText>
      </AppScreen>
    );
  }

  return (
    <AppScreen
      header={<ScreenHeader title={L('csTitle')} extra={`${patient.name[language]} · #${nf(patient.serial)}`} onBack={() => router.back()} />}
      contentStyle={styles.content}
      footer={
        <View style={styles.flex}>
          {sent
            ? <ActionButton label={t('csBackToQueue')} onPress={() => router.back()} />
            : <ActionButton label={t('csSendFinish')} onPress={sendAndFinish} disabled={!hasContent} />}
        </View>
      }
    >
      {sent ? (
        <KanthaCard style={styles.done}>
          <View style={styles.doneIcon}><Ionicons name="checkmark" size={30} color={colors.surface} /></View>
          <AppText style={styles.doneTitle}>{t('csSent')}</AppText>
          <AppText style={styles.meta}>{tf('csSentHint', { name: patient.name[language] })}</AppText>
        </KanthaCard>
      ) : (
        <>
          <View style={styles.patientRow}>
            <AppText style={styles.name}>{patient.name[language]}</AppText>
            <AppText style={styles.meta}>{tf('csAge', { n: patient.age })}</AppText>
          </View>
          <AiSummary summary={patient.summary} />

          <View style={styles.section}>
            <BiText text={L('csDiagnosis')} style={styles.heading} />
            {isDemoPatient ? (
              <BiText text={prescription.diagnosis} style={styles.diagnosis} />
            ) : (
              <TextInput
                accessibilityLabel={t('csDiagnosis')}
                value={diagnosis}
                onChangeText={setDiagnosis}
                placeholder={t('csDiagnosisPlaceholder')}
                placeholderTextColor={colors.muted}
                style={styles.input}
              />
            )}
          </View>

          {isDemoPatient ? (
            <>
              <View style={styles.section}>
                <BiText text={L('csMedicines')} style={styles.heading} />
                {prescription.medicines.map((medicine) => {
                  const on = medicineIds.includes(medicine.id);
                  return (
                    <Pressable
                      key={medicine.id}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: on }}
                      onPress={() => setMedicineIds((list) => toggle(list, medicine.id))}
                      style={[styles.pick, on && styles.pickOn]}
                    >
                      <Ionicons name={on ? 'checkbox' : 'square-outline'} size={22} color={on ? colors.brand : colors.muted} />
                      <MaterialCommunityIcons name="pill" size={18} color={colors.green2} />
                      <View style={styles.flex}>
                        <AppText style={styles.pickName}>{medicine.name[language]}</AppText>
                        <AppText style={styles.meta}>{medicine.schedule[language]}</AppText>
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.section}>
                <BiText text={L('csTests')} style={styles.heading} />
                <View style={styles.chips}>
                  {TEST_OPTIONS.map((test) => {
                    const on = tests.includes(test);
                    return (
                      <Pressable
                        key={test}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: on }}
                        onPress={() => setTests((list) => toggle(list, test))}
                        style={[styles.chip, on && styles.chipOn]}
                      >
                        <AppText style={[styles.chipText, on && styles.chipTextOn]}>{test}</AppText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
              {!hasContent ? <AppText style={styles.error}>{t('csNeedOne')}</AppText> : null}
            </>
          ) : null}
        </>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingTop: 16, gap: 16 },
  patientRow: { gap: 2 },
  name: { color: colors.text, fontSize: 18, lineHeight: 26, fontWeight: '700' },
  meta: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  section: { gap: 8 },
  heading: { color: colors.text, fontSize: 15, lineHeight: 22, fontWeight: '700' },
  diagnosis: { color: colors.brand, fontSize: 14, lineHeight: 22, fontWeight: '600' },
  input: {
    minHeight: 50, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
    color: colors.text, paddingHorizontal: 14, fontSize: 16, fontFamily: FONT_FAMILIES.regular,
  },
  pick: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  pickOn: { borderColor: colors.green2, backgroundColor: colors.mint },
  pickName: { color: colors.text, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 40, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  chipOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { color: colors.text, fontSize: 14, fontWeight: '600' },
  chipTextOn: { color: colors.surface },
  error: { color: colors.danger, fontSize: 12, lineHeight: 18 },
  done: { alignItems: 'center', gap: 8, paddingVertical: 28 },
  doneIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  doneTitle: { color: colors.brand, fontSize: 22, lineHeight: 30, fontWeight: '700' },
});
