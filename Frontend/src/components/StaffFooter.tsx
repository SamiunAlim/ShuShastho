import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { ActionButton } from './ui';

/** Sticky footer for staff screens: jump to another demo role, or log out. */
export function StaffFooter() {
  const { t } = useLanguage();
  const { openSwitcher, signOut } = useAuth();
  return (
    <>
      <View style={styles.flex}><ActionButton label={t('switchRoleAction')} onPress={openSwitcher} variant="secondary" /></View>
      <View style={styles.flex}><ActionButton label={t('logOut')} onPress={signOut} variant="secondary" /></View>
    </>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
