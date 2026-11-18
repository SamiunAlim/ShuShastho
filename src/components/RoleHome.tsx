import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import colors from '../constants/colors';
import { ROLE_META } from '../constants/roles';
import { Role, useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { ActionButton, AppScreen, AppText, BiText, Card, KanthaCard, ScreenHeader } from './ui';

/** Simple placeholder home for staff roles; the real workflows arrive in batch 3. */
export function RoleHome({ role }: { role: Exclude<Role, 'patient'> }) {
  const { L, t, language } = useLanguage();
  const { session, signOut, openSwitcher } = useAuth();
  const meta = ROLE_META[role];

  return (
    <AppScreen header={<ScreenHeader title={L(meta.label)} />} contentStyle={styles.content}>
      <KanthaCard style={styles.card}>
        <View style={styles.icon}><Ionicons name={meta.icon} size={28} color={colors.brand} /></View>
        {session ? <AppText style={styles.name}>{session.name[language]}</AppText> : null}
        <BiText text={L(meta.destination)} style={styles.dest} />
      </KanthaCard>
      <Card><AppText style={styles.note}>{t('areaComingNext')}</AppText></Card>
      <ActionButton label={t('demoRoleTitle')} onPress={openSwitcher} variant="secondary" />
      <ActionButton label={t('logOut')} onPress={signOut} variant="secondary" />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  card: { alignItems: 'center', gap: 6, paddingVertical: 24 },
  icon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.mint2, alignItems: 'center', justifyContent: 'center' },
  name: { color: colors.text, fontSize: 18, lineHeight: 26, fontWeight: '700' },
  dest: { color: colors.brand, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  note: { color: colors.muted, fontSize: 13, lineHeight: 20 },
});
