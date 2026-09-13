import '../global.css';
import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StripeProvider } from '@stripe/stripe-react-native';
import { useAuthStore } from '../store/authStore';
import { useOnboardingStore } from '../store/onboardingStore';
import { resolveStripePublishableKey } from '../lib/api/config';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

SplashScreen.preventAutoHideAsync();

// The publishable key is safe to embed client-side (unlike the backend's
// secret key) — same "fail loudly only when actually used" placeholder
// pattern as the backend's STRIPE_CLIENT factory: StripeProvider must always
// mount (checkout.tsx's useStripe() needs a provider in the tree regardless
// of whether Stripe is configured yet), and a real payment attempt without a
// real key fails with Stripe's own error at that point, not app boot.
const STRIPE_PUBLISHABLE_KEY = resolveStripePublishableKey() ?? 'pk_test_not_configured';

export default function RootLayout() {
  const authLaden = useAuthStore((s) => s.laden);
  const authIsLoading = useAuthStore((s) => s.isLoading);
  const onboardingLaden = useOnboardingStore((s) => s.laden);
  const onboardingIsLoading = useOnboardingStore((s) => s.isLoading);

  useEffect(() => {
    // Sequential, not Promise.all — onboardingLaden() reads authStore's
    // token (the current session's bearer secret) to call the real backend,
    // so authLaden() must resolve first.
    (async () => {
      await authLaden();
      await onboardingLaden();
      SplashScreen.hideAsync();
    })();
  }, [authLaden, onboardingLaden]);

  if (authIsLoading || onboardingIsLoading) return null;

  return (
    <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="(app)" />
          <Stack.Screen
            name="scan"
            options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="einstieg"
            options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen name="katalog" />
        </Stack>
      </GestureHandlerRootView>
    </StripeProvider>
  );
}
