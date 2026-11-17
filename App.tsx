 import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
const colors = {
  background: '#FFFFFF',
  primary: '#2E7D32',
};

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    PurnoPran: require('./assets/fonts/PurnoPran-Regular.ttf'),
  });

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.text}>সুস্বাস্থ্য</Text>
      <Text style={styles.text}>আপনার স্বাস্থ্যের বিশ্বস্ত সঙ্গী</Text>
      {fontError && (
        <Text style={styles.error}>Font error: {String(fontError)}</Text>
      )}
      <StatusBar style="dark" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  text: {
    fontFamily: 'PurnoPran',
    fontSize: 24,
    color: colors.primary,
    textAlign: 'center',
  },
  error: {
    marginTop: 16,
    color: 'red',
    textAlign: 'center',
  },
});