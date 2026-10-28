import React from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function ScanLayout() {
  // Eigener Provider: im fullScreenModal maß die SafeAreaView sonst einen
  // oberen Abstand von 0 — Kopfzeile und Zurück-Pfeil lagen unter der
  // Statusleiste und waren nicht antippbar.
  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="rezept" options={{ gestureEnabled: false }} />
        <Stack.Screen name="krankenkasse" />
        <Stack.Screen name="review" />
        <Stack.Screen name="datenpruefung" />
        <Stack.Screen name="versorgungen" />
        <Stack.Screen name="termin" />
        <Stack.Screen name="checkout" options={{ gestureEnabled: false }} />
        <Stack.Screen name="notfall" />
      </Stack>
    </SafeAreaProvider>
  );
}
