import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import colors from '../constants/colors';
import { useLanguage } from '../context/LanguageContext';
import { isBackendConfigured } from '../services/api';
import { useOffline } from '../services/connection';
import { AppText } from './ui';

/** Small "offline demo" pill shown while a backend is configured but not reachable (demo data is in use). */
export function OfflineBadge() {
  const offline = useOffline();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  if (!offline || !isBackendConfigured()) return null;

  return (
    <View pointerEvents="none" style={[styles.badge, { top: insets.top + 4 }]}>
      <View style={styles.dot} />
      <AppText style={styles.text}>{t('offlineDemo')}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
    backgroundColor: colors.yellow,
    zIndex: 100,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.yellowText },
  text: { color: colors.yellowText, fontSize: 11, lineHeight: 16, fontWeight: '600' },
});
