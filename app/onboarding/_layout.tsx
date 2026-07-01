import React from 'react';
import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="leistungsuebersicht" />
      <Stack.Screen name="agb" />
      <Stack.Screen name="datenschutz-text" />
    </Stack>
  );
}
