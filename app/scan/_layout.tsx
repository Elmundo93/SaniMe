import React from 'react';
import { Stack } from 'expo-router';

export default function ScanLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="rezept" options={{ gestureEnabled: false }} />
      <Stack.Screen name="krankenkasse" />
      <Stack.Screen name="review" />
      <Stack.Screen name="datenpruefung" />
      <Stack.Screen name="versorgungen" />
      <Stack.Screen name="termin" />
      <Stack.Screen name="zusammenfassung" />
      <Stack.Screen name="checkout" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
