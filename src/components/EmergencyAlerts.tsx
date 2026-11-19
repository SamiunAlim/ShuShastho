import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import colors from '../constants/colors';
import type { TranslationKey } from '../constants/i18n';
import { useLanguage } from '../context/LanguageContext';
import { useEmergencyAlerts } from '../hooks/usePolling';
import { isBackendConfigured, updateEmergencyAlert, type EmergencyAlert } from '../services/api';
import { setOffline } from '../services/connection';
import { AppText, BiText, Card } from './ui';

const SOURCE_LABEL: Record<EmergencyAlert['source'], TranslationKey> = {
  sos: 'alertSourceSos',
  'ai-triage': 'alertSourceAi',
  checkin: 'alertSourceCheckin',
};

const STATUS_LABEL: Record<EmergencyAlert['status'], TranslationKey> = {
  open: 'alertOpen',
  acknowledged: 'alertAcknowledged',
  resolved: 'alertResolved',
};

function timeOf(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** Emergency alerts from the backend, polled every 3 s. Shown on the doctor and hospital-admin screens. */
export function EmergencyAlerts() {
  const { t, L, nf } = useLanguage();
  const { alerts, refresh } = useEmergencyAlerts();
  if (!isBackendConfigured()) return null;

  const update = (id: string, status: 'acknowledged' | 'resolved') => {
    updateEmergencyAlert(id, status).then(refresh).catch(() => setOffline(true));
  };

  return (
    <View style={styles.wrap}>
      <BiText text={L('alertsTitle')} style={styles.heading} />
      {alerts.length === 0 ? (
        <Card style={styles.empty}><AppText style={styles.meta}>{t('alertsNone')}</AppText></Card>
      ) : (
        alerts.slice(0, 6).map((alert) => (
          <Card key={alert.id} style={[styles.card, alert.status === 'open' && styles.cardOpen, alert.status === 'resolved' && styles.dim]}>
            <View style={styles.top}>
              <Ionicons name="warning" size={18} color={colors.danger} />
              <View style={styles.flex}>
                <AppText style={styles.name}>{alert.patientName}</AppText>
                <AppText style={styles.meta}>{t(SOURCE_LABEL[alert.source])} · {nf(timeOf(alert.createdAt))}</AppText>
              </View>
              <View style={[styles.chip, alert.status === 'open' && styles.chipOpen]}>
                <AppText style={[styles.chipText, alert.status === 'open' && styles.chipTextOpen]}>{t(STATUS_LABEL[alert.status])}</AppText>
              </View>
            </View>
            <AppText style={styles.message} numberOfLines={2}>{alert.message}</AppText>
            {alert.status !== 'resolved' ? (
              <View style={styles.actions}>
                {alert.status === 'open' ? <AlertButton label={t('alertAcknowledge')} onPress={() => update(alert.id, 'acknowledged')} /> : null}
                <AlertButton label={t('alertResolve')} onPress={() => update(alert.id, 'resolved')} primary />
              </View>
            ) : null}
          </Card>
        ))
      )}
    </View>
  );
}

function AlertButton({ label, onPress, primary = false }: { label: string; onPress: () => void; primary?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.button, primary && styles.buttonPrimary]}>
      <AppText style={[styles.buttonText, primary && styles.buttonTextPrimary]}>{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrap: { gap: 10 },
  heading: { color: colors.danger, fontSize: 16, lineHeight: 24, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 16 },
  card: { gap: 8 },
  cardOpen: { borderColor: colors.danger, backgroundColor: colors.redSoft },
  dim: { opacity: 0.55 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { color: colors.text, fontSize: 14, lineHeight: 21, fontWeight: '700' },
  meta: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  message: { color: colors.text, fontSize: 13, lineHeight: 20 },
  chip: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, backgroundColor: colors.grey },
  chipOpen: { backgroundColor: colors.danger },
  chipText: { color: colors.muted, fontSize: 11, fontWeight: '600' },
  chipTextOpen: { color: colors.surface },
  actions: { flexDirection: 'row', gap: 8 },
  button: { borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 7 },
  buttonPrimary: { backgroundColor: colors.brand, borderColor: colors.brand },
  buttonText: { color: colors.text, fontSize: 12, fontWeight: '600' },
  buttonTextPrimary: { color: colors.surface },
});
