import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen } from '../../components/ui/Screen';
import { ScrollContainer } from '../../components/ui/ScrollContainer';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { EinstiegOption } from '../../components/ui/EinstiegOption';
import { useOnboardingStore, STATUS_META } from '../../store/onboardingStore';
import { zeigeDispatchFehler } from '../../lib/onboardingNav';
import { D } from '@sanime/design-system';

// Ersetzt den früheren Direkt-Sprung des "+"-Buttons zu /scan/rezept — der
// Nutzer wählt hier den Einstieg.
export default function EinstiegScreen() {
  const router = useRouter();
  const starten = useOnboardingStore((s) => s.starten);
  const dispatch = useOnboardingStore((s) => s.dispatch);

  const handleKrankheitsbild = async () => {
    const session = await starten();
    // Anders als "Rezept scannen": REZEPT_AUFNAHME ist die WEITER-Standard-
    // Route ab LEISTUNGSUEBERSICHT, KRANKHEITSBILD_ERFASSUNG braucht dagegen
    // das explizite KRANKHEITSBILD_STARTEN-Event — bei einer frischen Session
    // (WILLKOMMEN/LEISTUNGSUEBERSICHT, Einwilligung noch nicht erteilt) also
    // dieselbe Vormerkung wie useProduktAuswahlDispatch, statt sich auf den
    // Guard-Bounce zu verlassen.
    if (session.status === 'WILLKOMMEN' || session.status === 'LEISTUNGSUEBERSICHT') {
      useOnboardingStore.getState().setPendingEinstiegEvent({ type: 'KRANKHEITSBILD_STARTEN' });
      router.push(STATUS_META[session.status].route as any);
      return;
    }
    const result = await dispatch({ type: 'KRANKHEITSBILD_STARTEN' });
    if (result.ok) {
      router.push(STATUS_META[result.session.status].route as any);
    } else {
      zeigeDispatchFehler();
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <ScreenHeader title="Wie möchtest du starten?" onBack={() => router.back()} />

      <ScrollContainer contentContainerStyle={styles.scrollContent}>
        <Animated.View entering={FadeInDown.delay(20).springify()}>
          <Text style={styles.sub}>
            Wähle, wie wir deine Versorgung am besten für dich finden.
          </Text>
        </Animated.View>

        <EinstiegOption
          index={0}
          icon="camera"
          titel="Rezept scannen"
          beschreibung="Fotografiere dein Rezept, den Rest übernehmen wir."
          onPress={async () => {
            await starten();
            router.push('/scan/rezept');
          }}
        />

        <EinstiegOption
          index={1}
          icon="message-circle"
          titel="Krankheitsbild beschreiben"
          beschreibung="Sag uns, was dir fehlt — wir schlagen passende Hilfsmittel vor."
          onPress={handleKrankheitsbild}
        />

        <EinstiegOption
          index={2}
          icon="grid"
          titel="Katalog durchsuchen"
          beschreibung="Stöbere selbst — auch ohne Rezept, z. B. bei Selbstzahler-Artikeln."
          onPress={() => router.push('/katalog')}
        />
      </ScrollContainer>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 20, paddingTop: 8, gap: 14 },
  sub: { fontSize: D.font.md, color: D.color.inkSecondary, lineHeight: 22, marginBottom: 8 },
});
