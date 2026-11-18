import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { RoleSwitcher } from '../components/RoleSwitcher';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { DeskProvider } from '../context/DeskContext';
import { LanguageProvider, useLanguage } from '../context/LanguageContext';
import { JourneyProvider } from '../context/JourneyContext';
import { QueueProvider } from '../context/QueueContext';
import colors from '../constants/colors';

function AppStack() {
  const { ready } = useLanguage();
  const { ready: authReady, session } = useAuth();
  // Hold the first render until the saved language and session are known (no flashes).
  if (!ready || !authReady) return null;

  const role = session?.role;
  const signedOut = !session;
  const needsProfile = role === 'patient' && !session?.profileDone;
  const patient = role === 'patient' && !needsProfile;

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }}>
        <Stack.Protected guard={signedOut}>
          <Stack.Screen name="splash" />
          <Stack.Screen name="login" />
          <Stack.Screen name="otp" />
        </Stack.Protected>
        <Stack.Protected guard={needsProfile}>
          <Stack.Screen name="profile-setup" />
        </Stack.Protected>
        <Stack.Protected guard={patient}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="assistant" />
          <Stack.Screen name="booking" />
          <Stack.Screen name="emergency" />
          <Stack.Screen name="prescription" />
          <Stack.Screen name="report" />
          <Stack.Screen name="checkin" />
        </Stack.Protected>
        <Stack.Protected guard={role === 'doctor'}>
          <Stack.Screen name="(doctor)" />
        </Stack.Protected>
        <Stack.Protected guard={role === 'receptionist'}>
          <Stack.Screen name="(receptionist)" />
        </Stack.Protected>
        <Stack.Protected guard={role === 'pharmacist'}>
          <Stack.Screen name="(pharmacist)" />
        </Stack.Protected>
      </Stack>
      <RoleSwitcher />
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
        <DeskProvider>
          <JourneyProvider>
            <AuthProvider>
              <AppStack />
            </AuthProvider>
          </JourneyProvider>
        </DeskProvider>
      </QueueProvider>
    </LanguageProvider>
  );
}
