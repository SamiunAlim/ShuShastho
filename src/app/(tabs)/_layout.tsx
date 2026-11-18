import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { FONT_FAMILIES } from '../../components/ui';
import { useLanguage } from '../../context/LanguageContext';
import colors from '../../constants/colors';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const tabIcons: Record<string, { active: IconName; inactive: IconName }> = {
  index: { active: 'home', inactive: 'home-outline' },
  doctors: { active: 'medkit', inactive: 'medkit-outline' },
  serials: { active: 'ticket', inactive: 'ticket-outline' },
  records: { active: 'document-text', inactive: 'document-text-outline' },
  profile: { active: 'person', inactive: 'person-outline' },
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
        tabBarLabelStyle: { fontSize: 11, fontFamily: FONT_FAMILIES.medium },
        tabBarIcon: ({ focused }) => {
          const icons = tabIcons[route.name];
          return (
            <Ionicons
              name={focused ? icons.active : icons.inactive}
              size={22}
              color={focused ? colors.brand : colors.muted}
            />
          );
        },
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
