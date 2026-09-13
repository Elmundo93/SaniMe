import { Stack } from 'expo-router';

// Bewusst ein normaler Push-Stack (nicht fullScreenModal wie `scan`/`einstieg`)
// — Katalog-Browsing soll sich nach "stöbern" anfühlen, nicht nach dem Start
// eines verbindlichen Prozesses. Kein useOnboardingGuard: Browsing selbst
// startet keine Session (siehe app/katalog/index.tsx).
export default function KatalogLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
