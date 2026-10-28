import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Animated from 'react-native-reanimated';
import { einblenden } from '../../lib/einblenden';
import { Screen } from '../../components/ui/Screen';
import { ScrollContainer } from '../../components/ui/ScrollContainer';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { EinstiegOption } from '../../components/ui/EinstiegOption';
import { useOnboardingStore } from '../../store/onboardingStore';
import { zeigeDispatchFehler } from '../../lib/onboardingNav';
import { useRezeptVersorgung } from '../../hooks/useRezeptVersorgung';
import { D } from '@sanime/design-system';

// Ersetzt den früheren Direkt-Sprung des "+"-Buttons zu /scan/rezept — der
// Nutzer wählt hier den Einstieg. Nur „Rezept scannen“ startet einen Prozess;
// „Beschreiben“ und „Katalog“ führen in die sessionlose Discovery (/katalog
// ist eine eigene Route, weil aus diesem Vollbild-Modal nicht sauber in den
// Katalog-Tab gesprungen werden kann).
export default function EinstiegScreen() {
  const router = useRouter();
  const prozessStarten = useOnboardingStore((s) => s.prozessStarten);
  // Ohne bestellbare Kassenartikel gibt es den Rezept-Weg (noch) nicht —
  // ausblenden statt in eine leere Versorgungsauswahl zu führen.
  const mitRezept = useRezeptVersorgung() !== false;
  const versatz = mitRezept ? 1 : 0;

  const handleRezept = async () => {
    const result = await prozessStarten('REZEPT');
    if (result.ok) router.push(result.route as any);
    else zeigeDispatchFehler(result.reason);
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <ScreenHeader title="Wie möchtest du starten?" onBack={() => router.back()} />

      <ScrollContainer contentContainerStyle={styles.scrollContent}>
        <Animated.View entering={einblenden(20)}>
          <Text style={styles.sub}>
            {mitRezept
              ? 'Wähle, wie wir deine Versorgung am besten für dich finden.'
              : 'Finde passende Hilfsmittel und bestelle sie bequem nach Hause. Bestellungen mit Rezept nehmen wir bald an.'}
          </Text>
        </Animated.View>

        {mitRezept && (
          <EinstiegOption
            index={0}
            icon="camera"
            titel="Rezept scannen"
            beschreibung="Fotografiere dein Rezept, den Rest übernehmen wir."
            onPress={handleRezept}
          />
        )}

        <EinstiegOption
          index={versatz}
          icon="message-circle"
          titel="Beschreiben, wobei du Hilfe brauchst"
          beschreibung="Im Alltag oder bei einer Erkrankung — per Text oder Sprache. Wir zeigen dir passende Hilfsmittel."
          onPress={() => router.push('/katalog/hilfe')}
        />

        <EinstiegOption
          index={versatz + 1}
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
