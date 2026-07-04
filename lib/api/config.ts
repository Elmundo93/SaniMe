import Constants from 'expo-constants';

export function resolveApiBaseUrl(): string {
  const fromExtra = Constants.expoConfig?.extra?.apiUrl as string | undefined;
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  const url = fromExtra ?? fromEnv;
  if (!url) {
    throw new Error('API-Basis-URL fehlt — app.json "extra.apiUrl" oder EXPO_PUBLIC_API_URL setzen');
  }
  return url;
}

// Stripe's publishable key is meant to be client-visible (unlike the secret
// key, which only ever lives in the backend's .env) — safe to ship in
// app.json the same way apiUrl is. Returns null rather than throwing when
// unset, since StripeProvider is mounted unconditionally at the app root
// (app/_layout.tsx) and must not crash app boot just because Stripe hasn't
// been configured yet — only the checkout screen's payment step needs it.
export function resolveStripePublishableKey(): string | null {
  const fromExtra = Constants.expoConfig?.extra?.stripePublishableKey as string | undefined;
  const fromEnv = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  return fromExtra ?? fromEnv ?? null;
}
