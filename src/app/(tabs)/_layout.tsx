import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, FONT_FAMILIES } from '../../components/ui';
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
  const { t, L, language } = useLanguage();
  const labelKeys = {
    index: 'home',
    doctors: 'doctors',
    serials: 'serials',
    records: 'records',
    profile: 'profile',
  } as const;
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
          height: 72,
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
        // Bangla mode: Bangla label + small grey English line; English mode: English only.
        tabBarLabel: ({ focused }) => {
          const key = labelKeys[route.name as keyof typeof labelKeys];
          return (
            <View style={tabStyles.label}>
              <AppText style={[tabStyles.main, { color: focused ? colors.brand : colors.muted }]}>
                {labels[route.name as keyof typeof labels]}
              </AppText>
              {language === 'bn' ? <AppText style={tabStyles.sub}>{L(key).en}</AppText> : null}
            </View>
          );
        },
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

const tabStyles = StyleSheet.create({
  label: { alignItems: 'center' },
  main: { fontSize: 11, lineHeight: 15, fontFamily: FONT_FAMILIES.medium },
  sub: { fontSize: 9, lineHeight: 11, color: colors.muted },
});
