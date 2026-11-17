import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { LanguageProvider } from '../context/LanguageContext';
import colors from '../constants/colors';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PurnoPran: require('../../assets/fonts/PurnoPran-Regular.ttf'),
  });

  if (!fontsLoaded) return null;

  return (
    <LanguageProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="assistant" />
        <Stack.Screen name="booking" />
        <Stack.Screen name="emergency" />
      </Stack>
    </LanguageProvider>
  );
}
