import React from 'react';
import { Stack } from 'expo-router';

/** Bereich nach dem Onboarding (Gäste wie erkannte Kunden). Die Start-Ansicht mit
 * Header + swipebaren Top-Tabs liegt in `(start)/`; Einstellungen (über das Zahnrad im
 * Header) und die Versorgungsdetailseite werden darüber gepusht; die Aufgaben (Glocke)
 * öffnen als Sheet-Modal — eine Übersicht, kein Prozess, daher kein fullScreenModal. Ebenso
 * „Mein Profil“ (aus den Einstellungen oder der Aufgabe „Profil vervollständigen“). */
export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(start)" />
      <Stack.Screen name="einstellungen/index" />
      <Stack.Screen name="dashboard/[id]" />
      <Stack.Screen name="aufgaben" options={{ presentation: 'modal' }} />
      <Stack.Screen name="profil" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
