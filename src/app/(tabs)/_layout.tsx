import { Tabs } from 'expo-router';
import React from 'react';
import { AppText } from '../../components/ui';
import { useLanguage } from '../../context/LanguageContext';
import colors from '../../constants/colors';

const tabSymbols: Record<string, string> = {
  index: '⌂',
  doctors: '✚',
  serials: '▤',
  records: '▣',
  profile: '◉',
};

export default function PatientTabsLayout() {
  const { t } = useLanguage();
  const labels = {
    index: t('home'),
    doctors: t('doctors'),
    serials: t('serials'),
    records: t('records'),
    profile: t('profile'),
  };

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          height: 66,
          paddingTop: 6,
          paddingBottom: 7,
          borderTopColor: colors.border,
          backgroundColor: colors.surface,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        tabBarIcon: ({ color }) => (
          <AppText style={{ color, fontSize: 21, lineHeight: 24 }}>
            {tabSymbols[route.name] ?? '•'}
          </AppText>
        ),
        title: labels[route.name as keyof typeof labels],
      })}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="doctors" />
      <Tabs.Screen name="serials" />
      <Tabs.Screen name="records" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
