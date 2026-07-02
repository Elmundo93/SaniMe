import '../global.css';
import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useAuthStore } from '../store/authStore';
import { useOnboardingStore } from '../store/onboardingStore';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const authLaden = useAuthStore((s) => s.laden);
  const authIsLoading = useAuthStore((s) => s.isLoading);
  const onboardingLaden = useOnboardingStore((s) => s.laden);
  const onboardingIsLoading = useOnboardingStore((s) => s.isLoading);

  useEffect(() => {
    Promise.all([authLaden(), onboardingLaden()]).then(() => {
      SplashScreen.hideAsync();
    });
  }, [authLaden, onboardingLaden]);

  if (authIsLoading || onboardingIsLoading) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(app)" />
        <Stack.Screen
          name="scan"
          options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}
