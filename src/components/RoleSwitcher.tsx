import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import colors from '../constants/colors';
import { ROLE_META } from '../constants/roles';
import { ROLES, useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { ActionButton, AppText, BiText } from './ui';

/**
 * Hidden demo role switcher — opened by long-pressing the logo anywhere.
 * Jumps straight into a role (no login); the root layout's guards do the routing.
 */
export function RoleSwitcher() {
  const { switcherOpen, closeSwitcher, switchRole, session } = useAuth();
  const { t, L } = useLanguage();

  return (
    <Modal visible={switcherOpen} transparent animationType="fade" onRequestClose={closeSwitcher}>
      <Pressable style={styles.backdrop} onPress={closeSwitcher} accessibilityLabel={t('close')}>
        {/* Inner Pressable swallows taps so only the backdrop dismisses. */}
        <Pressable style={styles.sheet} onPress={() => undefined} accessible={false}>
          <AppText style={styles.title}>{t('demoRoleTitle')}</AppText>
          <AppText style={styles.subtitle}>{t('demoRoleSubtitle')}</AppText>
          <View style={styles.list}>
            {ROLES.map((role) => {
              const meta = ROLE_META[role];
              const current = session?.role === role;
              return (
                <Pressable
                  key={role}
                  accessibilityRole="button"
                  accessibilityState={{ selected: current }}
                  onPress={() => switchRole(role)}
                  style={({ pressed }) => [styles.row, current && styles.rowCurrent, pressed && styles.pressed]}
                >
                  <View style={styles.icon}><Ionicons name={meta.icon} size={20} color={colors.brand} /></View>
                  <View style={styles.flex}>
                    <BiText text={L(meta.label)} style={styles.roleName} />
                    <AppText style={styles.destination}>{t(meta.destination)}</AppText>
                  </View>
                  {current ? <AppText style={styles.currentTag}>{t('demoRoleCurrent')}</AppText> : null}
                </Pressable>
              );
            })}
          </View>
          <ActionButton label={t('close')} onPress={closeSwitcher} variant="secondary" />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(30,43,39,0.45)', justifyContent: 'center', padding: 20 },
  sheet: { backgroundColor: colors.surface, borderRadius: 20, padding: 18, gap: 12, maxWidth: 440, width: '100%', alignSelf: 'center' },
  title: { color: colors.text, fontSize: 18, lineHeight: 26, fontWeight: '700' },
  subtitle: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: -8 },
  list: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  rowCurrent: { backgroundColor: colors.mint, borderColor: colors.green2 },
  pressed: { opacity: 0.8 },
  icon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.mint2, alignItems: 'center', justifyContent: 'center' },
  roleName: { color: colors.text, fontSize: 15, lineHeight: 22, fontWeight: '600' },
  destination: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  currentTag: { color: colors.brand, fontSize: 11, fontWeight: '700' },
});
