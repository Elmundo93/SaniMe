import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeIn, FadeOut } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { GlassCard } from '../../components/ui/GlassCard';
import { Screen } from '../../components/ui/Screen';
import { ScrollContainer } from '../../components/ui/ScrollContainer';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { FormField } from '../../components/ui/FormField';
import { MicButton } from '../../components/ui/MicButton';
import { StepCounter } from '../../components/onboarding/StepCounter';
import { OnboardingLoadingView } from '../../components/onboarding/OnboardingLoadingView';
import { useOnboardingStore, STATUS_META } from '../../store/onboardingStore';
import { useOnboardingGuard } from '../../hooks/useOnboardingGuard';
import { useSprachEingabe } from '../../lib/voice/krankheitsbildSpracherkennung';
import { zeigeDispatchFehler } from '../../lib/onboardingNav';
import { D } from '@sanime/design-system';
import { KRANKHEITSBILD_KATALOG, type Krankheitsbild } from '@sanime/domain';

// Zugänglicher Einstieg für Nutzer ohne Rezept: große Kacheln + Suchfeld statt
// Freitext, damit auch wenig technikaffine Nutzer ihr Anliegen einfach finden
// (siehe CLAUDE.md: primär ältere Zielgruppe). Die Taxonomie selbst kommt rein
// lokal aus @sanime/domain — kein Netzwerk-Call für die Liste nötig.
// Sprach-Eingabe (MicButton) ergänzt die Suche, ersetzt sie nie — ein
// erkanntes Krankheitsbild wird immer erst zur Bestätigung angezeigt, nie
// direkt dispatcht (siehe useSprachEingabe/CLAUDE.md: "OCR/derived output is
// never final").
export default function KrankheitsbildScreen() {
  const router = useRouter();
  const { session, ready } = useOnboardingGuard('KRANKHEITSBILD_ERFASSUNG');
  const dispatch = useOnboardingStore((s) => s.dispatch);
  const sprachEingabe = useSprachEingabe();
  const [suchtext, setSuchtext] = useState('');
  const [auswahlLaeuft, setAuswahlLaeuft] = useState<string | null>(null);

  if (!ready || !session) return <OnboardingLoadingView />;

  const text = suchtext.trim().toLowerCase();
  const treffer = text
    ? KRANKHEITSBILD_KATALOG.filter(
        (kb) => kb.bezeichnung.toLowerCase().includes(text) || kb.synonyme.some((s) => s.includes(text)),
      )
    : KRANKHEITSBILD_KATALOG;

  const handleZurück = async () => {
    const result = await dispatch({ type: 'ZURUECK' });
    if (result.ok) {
      router.replace(STATUS_META[result.session.status].route as any);
    } else {
      zeigeDispatchFehler();
    }
  };

  const handleAuswahl = async (kb: Krankheitsbild) => {
    setAuswahlLaeuft(kb.id);
    // produkte wird serverseitig ohnehin immer neu berechnet — reiner
    // Platzhalter, um den lokalen TS-Typ zu erfüllen (gleiches Muster wie
    // KRANKENKASSE_UEBERSPRUNGEN in krankenkasse.tsx).
    const result = await dispatch({ type: 'KRANKHEITSBILD_AUSGEWAEHLT', krankheitsbildId: kb.id, produkte: [] });
    setAuswahlLaeuft(null);
    if (result.ok) {
      router.push(STATUS_META[result.session.status].route as any);
    } else {
      zeigeDispatchFehler();
    }
  };

  const handleMicPress = () => {
    if (sprachEingabe.status === 'hoert_zu') {
      sprachEingabe.stop();
    } else {
      sprachEingabe.start();
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <ScreenHeader
        title="Krankheitsbild beschreiben"
        onBack={handleZurück}
        right={
          <StepCounter
            aktuellerSchritt={STATUS_META.KRANKHEITSBILD_ERFASSUNG.schritt}
            gesamtSchritte={8}
            variant="light"
            label={`${STATUS_META.KRANKHEITSBILD_ERFASSUNG.schritt}/8`}
          />
        }
      />

      <ScrollContainer contentContainerStyle={styles.scrollContent}>
        <Animated.View entering={FadeInDown.delay(20).springify()}>
          <Text style={styles.sub}>Wähle, was am ehesten zutrifft, tippe in die Suche — oder sag es uns per Sprache.</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(60).springify()} style={styles.suchReihe}>
          <View style={{ flex: 1 }}>
            <FormField
              label="Suche"
              value={suchtext}
              onChangeText={setSuchtext}
              placeholder="z. B. Gehen, Atmen, Wunde…"
              accessibilityHint="Filtert die Liste unten"
            />
          </View>
          <View style={styles.micWrap}>
            <MicButton hoertZu={sprachEingabe.status === 'hoert_zu'} onPress={handleMicPress} />
          </View>
        </Animated.View>

        {sprachEingabe.status === 'hoert_zu' && (
          <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.hoertZuBox}>
            <Feather name="mic" size={14} color={D.color.accent} />
            <Text style={styles.hoertZuText}>{sprachEingabe.transkript || 'Ich höre zu…'}</Text>
          </Animated.View>
        )}

        {sprachEingabe.status === 'fehler' && sprachEingabe.fehlerText && (
          <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.fehlerBox}>
            <Text style={styles.fehlerText}>{sprachEingabe.fehlerText}</Text>
          </Animated.View>
        )}

        {sprachEingabe.status === 'verarbeitet' && (
          <Animated.View entering={FadeIn} exiting={FadeOut}>
            {sprachEingabe.erkanntesKrankheitsbild ? (
              <View style={styles.bestaetigungBox}>
                <LinearGradient colors={['rgba(63,139,255,0.12)', 'rgba(63,139,255,0.05)']} style={StyleSheet.absoluteFill} />
                <Text style={styles.bestaetigungLabel}>Meintest du</Text>
                <Text style={styles.bestaetigungWert}>{sprachEingabe.erkanntesKrankheitsbild.bezeichnung}</Text>
                <View style={styles.bestaetigungRow}>
                  <TouchableOpacity
                    style={[styles.bestaetigungButton, styles.bestaetigungButtonPrimaer]}
                    onPress={() => sprachEingabe.erkanntesKrankheitsbild && handleAuswahl(sprachEingabe.erkanntesKrankheitsbild)}
                    disabled={auswahlLaeuft === sprachEingabe.erkanntesKrankheitsbild.id}
                    accessibilityRole="button"
                  >
                    {auswahlLaeuft === sprachEingabe.erkanntesKrankheitsbild.id ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.bestaetigungButtonTextPrimaer}>Ja, das ist es</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.bestaetigungButton}
                    onPress={sprachEingabe.zuruecksetzen}
                    accessibilityRole="button"
                  >
                    <Text style={styles.bestaetigungButtonText}>Ich suche selbst</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.mittigBlock}>
                <Feather name="help-circle" size={22} color={D.color.inkTertiary} />
                <Text style={styles.hinweisText}>
                  Wir konnten das leider keinem Krankheitsbild zuordnen. Bitte wähle unten aus der Liste.
                </Text>
              </View>
            )}
          </Animated.View>
        )}

        {treffer.length === 0 && (
          <View style={styles.mittigBlock}>
            <Feather name="search" size={22} color={D.color.inkTertiary} />
            <Text style={styles.hinweisText}>Keine Treffer. Versuche einen anderen Begriff.</Text>
          </View>
        )}

        {treffer.map((kb, i) => (
          <Animated.View key={kb.id} entering={FadeInDown.delay(100 + i * 60).springify().damping(18)}>
            <TouchableOpacity
              onPress={() => handleAuswahl(kb)}
              disabled={auswahlLaeuft === kb.id}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={kb.bezeichnung}
            >
              <GlassCard padding={20} radius={D.radius.lg}>
                <View style={styles.row}>
                  <View style={styles.iconWrap}>
                    <Feather name={kb.icon as React.ComponentProps<typeof Feather>['name']} size={22} color={D.color.accent} />
                  </View>
                  <Text style={styles.bezeichnung}>{kb.bezeichnung}</Text>
                  <Feather name="chevron-right" size={20} color={D.color.inkTertiary} />
                </View>
              </GlassCard>
            </TouchableOpacity>
          </Animated.View>
        ))}

        <View style={{ height: 40 }} />
      </ScrollContainer>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 16, gap: 12 },
  sub: { fontSize: D.font.md, color: D.color.inkSecondary, lineHeight: 22 },
  suchReihe: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  micWrap: { paddingBottom: 2 },
  hoertZuBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: D.color.accentLight, borderRadius: D.radius.md,
    padding: 14, borderWidth: 1, borderColor: 'rgba(63,139,255,0.15)',
  },
  hoertZuText: { flex: 1, fontSize: D.font.sm, color: D.color.ink, fontStyle: 'italic' },
  fehlerBox: {
    backgroundColor: D.color.errorLight, borderRadius: D.radius.md, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255,59,48,0.2)',
  },
  fehlerText: { fontSize: D.font.sm, color: D.color.error, lineHeight: 19 },
  bestaetigungBox: {
    borderRadius: D.radius.md, padding: 18, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(63,139,255,0.18)', gap: 4,
  },
  bestaetigungLabel: { fontSize: 10, color: D.color.accent, fontWeight: D.font.bold, textTransform: 'uppercase', letterSpacing: 1 },
  bestaetigungWert: { fontSize: D.font.lg, fontWeight: D.font.bold, color: D.color.ink, marginBottom: 10 },
  bestaetigungRow: { flexDirection: 'row', gap: 10 },
  bestaetigungButton: {
    flex: 1, minHeight: 48, borderRadius: D.radius.md, alignItems: 'center', justifyContent: 'center',
    backgroundColor: D.color.bgSoft, borderWidth: 1, borderColor: D.color.glassBorder,
  },
  bestaetigungButtonPrimaer: { backgroundColor: D.color.accent, borderColor: D.color.accent },
  bestaetigungButtonText: { fontSize: D.font.sm, fontWeight: D.font.semibold, color: D.color.inkSecondary },
  bestaetigungButtonTextPrimaer: { fontSize: D.font.sm, fontWeight: D.font.bold, color: '#fff' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  iconWrap: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: D.color.accentLight,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  bezeichnung: { flex: 1, fontSize: D.font.md, fontWeight: D.font.bold, color: D.color.ink },
  mittigBlock: { alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 40 },
  hinweisText: { fontSize: D.font.sm, color: D.color.inkSecondary, textAlign: 'center', paddingHorizontal: 24, lineHeight: 19 },
});
