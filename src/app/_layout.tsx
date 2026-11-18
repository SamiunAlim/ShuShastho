import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { LanguageProvider, useLanguage } from '../context/LanguageContext';
import { JourneyProvider } from '../context/JourneyContext';
import { QueueProvider } from '../context/QueueContext';
import colors from '../constants/colors';

function AppStack() {
  const { ready } = useLanguage();
  // Hold the first render until the saved language is known, so Bangla/English never flashes.
  if (!ready) return null;
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="assistant" />
        <Stack.Screen name="booking" />
        <Stack.Screen name="emergency" />
        <Stack.Screen name="prescription" />
        <Stack.Screen name="report" />
        <Stack.Screen name="checkin" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    HindSiliguri_400Regular: require('../../assets/fonts/HindSiliguri_400Regular.ttf'),
    HindSiliguri_500Medium: require('../../assets/fonts/HindSiliguri_500Medium.ttf'),
    HindSiliguri_600SemiBold: require('../../assets/fonts/HindSiliguri_600SemiBold.ttf'),
    HindSiliguri_700Bold: require('../../assets/fonts/HindSiliguri_700Bold.ttf'),
  });

  if (!fontsLoaded) return null;

  return (
    <LanguageProvider>
      <QueueProvider>
        <JourneyProvider>
          <AppStack />
        </JourneyProvider>
      </QueueProvider>
    </LanguageProvider>
  );
}
