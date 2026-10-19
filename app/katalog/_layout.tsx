import { Stack } from 'expo-router';

// Bewusst ein normaler Push-Stack (nicht fullScreenModal wie `scan`/`einstieg`)
// — Katalog-Browsing soll sich nach "stöbern" anfühlen, nicht nach dem Start
// eines verbindlichen Prozesses. Kein useOnboardingGuard: Browsing selbst
// startet keine Session — erst „Zur Kasse“ im Warenkorb.
export default function KatalogLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="suche" />
      <Stack.Screen name="kategorie/[id]" />
      <Stack.Screen name="produkt/[id]" />
      <Stack.Screen name="hilfe/index" />
      <Stack.Screen name="hilfe/[typ]/[id]" />
      <Stack.Screen name="ratgeber/[id]" />
    </Stack>
  );
}
