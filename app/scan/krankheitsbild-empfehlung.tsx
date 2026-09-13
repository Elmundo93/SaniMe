import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { Screen } from '../../components/ui/Screen';
import { ScrollContainer } from '../../components/ui/ScrollContainer';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { ProduktKarte } from '../../components/produkt/ProduktKarte';
import { StepCounter } from '../../components/onboarding/StepCounter';
import { OnboardingLoadingView } from '../../components/onboarding/OnboardingLoadingView';
import { useOnboardingStore, STATUS_META } from '../../store/onboardingStore';
import { useOnboardingGuard } from '../../hooks/useOnboardingGuard';
import { useProduktAuswahlDispatch } from '../../hooks/useProduktAuswahlDispatch';
import { zeigeDispatchFehler } from '../../lib/onboardingNav';
import { D } from '@sanime/design-system';
import { findeKrankheitsbild } from '@sanime/domain';
import type { Produkt } from '@sanime/domain';

export default function KrankheitsbildEmpfehlungScreen() {
  const router = useRouter();
  const { session, ready } = useOnboardingGuard('KRANKHEITSBILD_EMPFEHLUNG');
  const dispatch = useOnboardingStore((s) => s.dispatch);
  const waehleProdukt = useProduktAuswahlDispatch('krankheitsbild');
  const [auswahlLaeuft, setAuswahlLaeuft] = useState<string | null>(null);

  if (!ready || !session) return <OnboardingLoadingView />;

  const krankheitsbild = session.ausgewaehltesKrankheitsbildId
    ? findeKrankheitsbild(session.ausgewaehltesKrankheitsbildId)
    : undefined;
  const produkte = session.verfügbareProdukte;

  const handleZurück = async () => {
    const result = await dispatch({ type: 'ZURUECK' });
    if (result.ok) {
      router.replace(STATUS_META[result.session.status].route as any);
    } else {
      zeigeDispatchFehler();
    }
  };

  const handleWaehlen = async (produkt: Produkt) => {
    setAuswahlLaeuft(produkt.id);
    try {
      await waehleProdukt(produkt);
    } finally {
      setAuswahlLaeuft(null);
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <ScreenHeader
        title="Deine Empfehlung"
        onBack={handleZurück}
        right={
          <StepCounter
            aktuellerSchritt={STATUS_META.KRANKHEITSBILD_EMPFEHLUNG.schritt}
            gesamtSchritte={8}
            variant="light"
            label={`${STATUS_META.KRANKHEITSBILD_EMPFEHLUNG.schritt}/8`}
          />
        }
      />

      <ScrollContainer contentContainerStyle={styles.scrollContent}>
        {krankheitsbild && (
          <Animated.View entering={FadeInDown.delay(40).springify().damping(18)}>
            <View style={styles.banner}>
              <LinearGradient colors={['rgba(63,139,255,0.12)', 'rgba(63,139,255,0.05)']} style={StyleSheet.absoluteFill} />
              <Text style={styles.bannerLabel}>Basierend auf</Text>
              <Text style={styles.bannerWert}>{krankheitsbild.bezeichnung}</Text>
            </View>
          </Animated.View>
        )}

        {produkte.length === 0 ? (
          <View style={styles.mittigBlock}>
            <Feather name="search" size={22} color={D.color.inkTertiary} />
            <Text style={styles.hinweisText}>
              Wir konnten dazu noch keine passenden Hilfsmittel finden. Bitte überprüfe die markierten Kategorien
              im vollen Katalog.
            </Text>
          </View>
        ) : (
          <Animated.View entering={FadeInDown.delay(100).springify()}>
            <Text style={styles.produkteAnzahl}>
              {produkte.length} passende Versorgung{produkte.length !== 1 ? 'en' : ''} gefunden
            </Text>
          </Animated.View>
        )}

        {produkte.map((produkt, i) => (
          <View key={produkt.id}>
            <ProduktKarte produkt={produkt} ausgewählt={false} onAuswählen={() => handleWaehlen(produkt)} index={i} />
            <TouchableOpacity
              style={styles.waehlenButton}
              onPress={() => handleWaehlen(produkt)}
              disabled={auswahlLaeuft === produkt.id}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={`${produkt.name} wählen`}
            >
              {auswahlLaeuft === produkt.id ? (
                <ActivityIndicator color={D.color.inkInverted} size="small" />
              ) : (
                <Text style={styles.waehlenButtonLabel}>Diese Versorgung wählen</Text>
              )}
            </TouchableOpacity>
          </View>
        ))}

        <Animated.View entering={FadeInDown.delay(400).springify()}>
          <TouchableOpacity
            onPress={() => router.push('/katalog')}
            style={styles.katalogLink}
            accessibilityRole="button"
            accessibilityLabel="Vollen Katalog ansehen"
          >
            <Text style={styles.katalogLinkText}>Nicht das Richtige dabei? Vollen Katalog ansehen</Text>
          </TouchableOpacity>
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollContainer>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 16, gap: 12 },
  banner: {
    borderRadius: D.radius.md, padding: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(63,139,255,0.18)',
  },
  bannerLabel: { fontSize: 10, color: D.color.accent, fontWeight: D.font.bold, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  bannerWert: { fontSize: D.font.lg, fontWeight: D.font.bold, color: D.color.ink },
  produkteAnzahl: { fontSize: D.font.sm, color: D.color.inkSecondary, fontWeight: D.font.medium, paddingLeft: 4 },
  mittigBlock: { alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 40 },
  hinweisText: { fontSize: D.font.sm, color: D.color.inkSecondary, textAlign: 'center', paddingHorizontal: 24, lineHeight: 19 },
  waehlenButton: {
    marginTop: -4, marginBottom: 8, height: 52, borderRadius: D.radius.lg,
    backgroundColor: D.color.accent, alignItems: 'center', justifyContent: 'center',
  },
  waehlenButtonLabel: { fontSize: D.font.md, fontWeight: D.font.bold, color: D.color.inkInverted },
  katalogLink: { minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  katalogLinkText: { fontSize: D.font.sm, fontWeight: D.font.semibold, color: D.color.accent },
});
