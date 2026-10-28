import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { NotfallAnfrage } from '@sanime/domain';
import { Screen } from '../../components/ui/Screen';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { ScrollContainer } from '../../components/ui/ScrollContainer';
import { NotfallFormular } from '../../components/versorgung/NotfallFormular';
import { OnboardingLoadingView } from '../../components/onboarding/OnboardingLoadingView';
import { useOnboardingGuard } from '../../hooks/useOnboardingGuard';
import { useOnboardingStore } from '../../store/onboardingStore';
import { selectProfil, useAuthStore } from '../../store/authStore';
import { zeigeDispatchFehler } from '../../lib/onboardingNav';
import { bestelltFuerSichSelbst } from '../../lib/besteller';

// Notfalllieferung an der Kasse: kein eigener Schritt der Bestellung, nur ein
// Vermerk (NOTFALL_ANGEFRAGT) — nach dem Absenden ruft unser Team an.
export default function CheckoutNotfallScreen() {
  const router = useRouter();
  const { session, ready } = useOnboardingGuard('CHECKOUT');
  const dispatch = useOnboardingStore((s) => s.dispatch);
  // Wer für sich selbst bestellt, überspringt die Telefonbestätigung der
  // Kasse — er nennt die Rückrufnummer hier; alle anderen bestätigen sie danach.
  const benutzer = useAuthStore((s) => s.benutzer);
  const telefon = useAuthStore((s) => selectProfil(s)?.telefon ?? '');
  const [laedt, setLaedt] = useState(false);

  if (!ready || !session) return <OnboardingLoadingView />;
  const bekannt = bestelltFuerSichSelbst(!!benutzer, benutzer?.versichertenNr, session.krankenkasse?.versichertenNr);

  const absenden = async (notfall: NotfallAnfrage) => {
    setLaedt(true);
    const result = await dispatch({ type: 'NOTFALL_ANGEFRAGT', notfall });
    setLaedt(false);
    if (result.ok) router.back();
    else zeigeDispatchFehler();
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <ScreenHeader title="Früher benötigt?" onBack={() => router.back()} />
      <ScrollContainer contentContainerStyle={styles.inhalt}>
        <NotfallFormular mitTelefon={bekannt} telefonVorbelegt={telefon} laedt={laedt} onAbsenden={absenden} />
        <View style={{ height: 40 }} />
      </ScrollContainer>
    </Screen>
  );
}

const styles = StyleSheet.create({
  inhalt: { padding: 16 },
});
