import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { StaffFooter } from '../../components/StaffFooter';
import { ActionButton, AppScreen, AppText, BiText, Card, KanthaCard, ScreenHeader } from '../../components/ui';
import colors from '../../constants/colors';
import type { TranslationKey } from '../../constants/i18n';
import { useAuth } from '../../context/AuthContext';
import { DeskPatient, useDesk, VisitStatus } from '../../context/DeskContext';
import { useLanguage } from '../../context/LanguageContext';
import { DEMO } from '../../services/mock';

const SCAN_MS = 1200;

const STATUS_STYLE: Record<VisitStatus, { label: TranslationKey; bg: string; fg: string }> = {
  done: { label: 'fdDone', bg: colors.grey, fg: colors.muted },
  serving: { label: 'fdWithDoctor', bg: colors.brand, fg: colors.surface },
  waiting: { label: 'areaCheckedIn', bg: colors.mint2, fg: colors.brand },
  notArrived: { label: 'areaNotArrived', bg: colors.yellow, fg: colors.yellowText },
  noShow: { label: 'fdNoShow', bg: colors.redSoft, fg: colors.danger },
};

type ScanState = { phase: 'idle' | 'scanning' } | { phase: 'done'; name: string } | { phase: 'none' };

/** Receptionist home: QR check-in (mock), today's queue with no-show / restore, and walk-ins. */
export default function FrontDeskScreen() {
  const { t, tf, L, nf, language } = useLanguage();
  const { session } = useAuth();
  const desk = useDesk();
  const [scan, setScan] = useState<ScanState>({ phase: 'idle' });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const startScan = () => {
    if (scan.phase === 'scanning') return;
    setScan({ phase: 'scanning' });
    timer.current = setTimeout(() => {
      const found = desk.scanQr();
      setScan(found ? { phase: 'done', name: found.name[language] } : { phase: 'none' });
    }, SCAN_MS);
  };

  return (
    <AppScreen
      header={<ScreenHeader title={L('destReceptionist')} extra={[DEMO.hospital[language], session?.name[language]].filter(Boolean).join(' · ')} />}
      contentStyle={styles.content}
      footer={<StaffFooter />}
    >
      <View style={styles.stats}>
        <Stat label={t('areaWaiting')} value={nf(desk.counts.waiting)} bg={colors.mint2} fg={colors.brand} />
        <Stat label={t('areaNotArrived')} value={nf(desk.counts.notArrived)} bg={colors.yellow} fg={colors.yellowText} />
        <Stat label={t('fdNoShow')} value={nf(desk.counts.noShow)} bg={colors.redSoft} fg={colors.danger} />
      </View>

      <KanthaCard style={styles.scanCard}>
        <View style={styles.scanRow}>
          <View style={styles.qrIcon}><Ionicons name="qr-code-outline" size={26} color={colors.brand} /></View>
          <View style={styles.flex}>
            <AppText style={styles.scanTitle}>{t('fdScanQr')}</AppText>
            <AppText style={styles.scanHint}>
              {scan.phase === 'scanning' ? t('fdScanning')
                : scan.phase === 'done' ? tf('fdScanned', { name: scan.name })
                : scan.phase === 'none' ? t('fdScanNone')
                : t('fdScanDemo')}
            </AppText>
          </View>
        </View>
        <View style={styles.actions}>
          <View style={styles.flex}>
            <ActionButton label={scan.phase === 'scanning' ? t('fdScanning') : t('fdScanQr')} onPress={startScan} disabled={scan.phase === 'scanning'} />
          </View>
          <View style={styles.flex}>
            <ActionButton label={t('fdWalkIn')} onPress={() => router.push('/walk-in')} variant="secondary" />
          </View>
        </View>
      </KanthaCard>

      <BiText text={L('fdQueue')} style={styles.heading} />
      <Card style={styles.list}>
        {desk.patients.map((patient, index) => (
          <PatientRow key={patient.serial} patient={patient} first={index === 0} />
        ))}
      </Card>
    </AppScreen>
  );
}

function PatientRow({ patient, first }: { patient: DeskPatient; first: boolean }) {
  const { t, nf, language } = useLanguage();
  const desk = useDesk();
  const style = STATUS_STYLE[patient.status];

  return (
    <View style={[styles.row, !first && styles.divider]}>
      <View style={styles.rowTop}>
        <View style={styles.serial}><AppText style={styles.serialText}>#{nf(patient.serial)}</AppText></View>
        <View style={styles.flex}>
          <AppText style={styles.name}>{patient.name[language]}</AppText>
          <AppText style={styles.meta} numberOfLines={1}>
            {patient.walkIn ? `${t('fdWalkInTag')} · ` : ''}{patient.summary[language]}
          </AppText>
        </View>
        <View style={[styles.chip, { backgroundColor: style.bg }]}>
          <AppText style={[styles.chipText, { color: style.fg }]}>{t(style.label)}</AppText>
        </View>
      </View>
      {patient.status === 'notArrived' || patient.status === 'waiting' || patient.status === 'noShow' ? (
        <View style={styles.rowActions}>
          {patient.status === 'notArrived' ? <SmallButton label={t('fdCheckIn')} onPress={() => desk.checkIn(patient.serial)} primary /> : null}
          {patient.status === 'noShow'
            ? <SmallButton label={t('fdRestore')} onPress={() => desk.setNoShow(patient.serial, false)} primary />
            : <SmallButton label={t('fdNoShow')} onPress={() => desk.setNoShow(patient.serial, true)} />}
        </View>
      ) : null}
    </View>
  );
}

function SmallButton({ label, onPress, primary = false }: { label: string; onPress: () => void; primary?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.small, primary && styles.smallPrimary, pressed && styles.pressed]}
    >
      <AppText style={[styles.smallText, primary && styles.smallTextPrimary]}>{label}</AppText>
    </Pressable>
  );
}

function Stat({ label, value, bg, fg }: { label: string; value: string; bg: string; fg: string }) {
  return (
    <View style={[styles.stat, { backgroundColor: bg }]}>
      <AppText style={[styles.statValue, { color: fg }]}>{value}</AppText>
      <AppText style={styles.statLabel}>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingTop: 16, gap: 14 },
  stats: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, borderRadius: 16, paddingVertical: 12, alignItems: 'center' },
  statValue: { fontSize: 24, lineHeight: 32, fontWeight: '700' },
  statLabel: { color: colors.muted, fontSize: 11 },
  scanCard: { gap: 12 },
  scanRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  qrIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.mint2, alignItems: 'center', justifyContent: 'center' },
  scanTitle: { color: colors.text, fontSize: 15, lineHeight: 22, fontWeight: '700' },
  scanHint: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 10 },
  heading: { color: colors.text, fontSize: 16, lineHeight: 24, fontWeight: '700' },
  list: { paddingVertical: 4 },
  row: { paddingVertical: 10, gap: 8 },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  serial: { minWidth: 46, paddingVertical: 4, borderRadius: 10, backgroundColor: colors.mint2, alignItems: 'center' },
  serialText: { color: colors.brand, fontSize: 13, fontWeight: '700' },
  name: { color: colors.text, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  meta: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  chip: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  chipText: { fontSize: 11, fontWeight: '600' },
  rowActions: { flexDirection: 'row', gap: 8, paddingLeft: 56 },
  small: { minHeight: 34, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  smallPrimary: { backgroundColor: colors.brand, borderColor: colors.brand },
  smallText: { color: colors.text, fontSize: 12, fontWeight: '600' },
  smallTextPrimary: { color: colors.surface },
  pressed: { opacity: 0.8 },
});
