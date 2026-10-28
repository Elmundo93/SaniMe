import Constants from 'expo-constants';
import { NativeModules, TurboModuleRegistry, type TurboModule } from 'react-native';

export function resolveApiBaseUrl(): string {
  const fromExtra = Constants.expoConfig?.extra?.apiUrl as string | undefined;
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  const url = fromExtra ?? fromEnv;
  if (!url) {
    throw new Error('API-Basis-URL fehlt — app.json "extra.apiUrl" oder EXPO_PUBLIC_API_URL setzen');
  }
  return mitDevHost(url);
}

// Im Dev-Build auf einem echten Gerät zeigt „localhost“ aufs Handy selbst.
// Der Rechner, von dem Metro das Bundle ausliefert, betreibt auch das Backend —
// also dessen Adresse einsetzen (im Simulator ist das ebenfalls korrekt).
function mitDevHost(url: string): string {
  const metroHost = __DEV__ ? ermittleMetroHost() : null;
  if (!metroHost) return url;
  return url.replace(/\/\/(localhost|127\.0\.0\.1)(?=[:/])/, `//${metroHost}`);
}

// expoConfig.hostUri fehlt im Dev-Client mit eingebettetem Manifest — die
// Adresse, von der das JS-Bundle tatsächlich geladen wurde, ist verlässlich.
function ermittleMetroHost(): string | null {
  const ausManifest = Constants.expoConfig?.hostUri?.split(':')[0];
  if (ausManifest) return ausManifest;
  const sourceCode = TurboModuleRegistry.get<SourceCodeModul>('SourceCode') ?? NativeModules.SourceCode;
  const scriptUrl: string | undefined = sourceCode?.getConstants?.().scriptURL;
  return scriptUrl?.match(/^https?:\/\/([^:/]+)/)?.[1] ?? null;
}

interface SourceCodeModul extends TurboModule {
  getConstants(): { scriptURL?: string };
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
