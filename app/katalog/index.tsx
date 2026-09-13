import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { Screen } from '../../components/ui/Screen';
import { ScrollContainer } from '../../components/ui/ScrollContainer';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { FormField } from '../../components/ui/FormField';
import { ProduktKarte } from '../../components/produkt/ProduktKarte';
import { useProduktAuswahlDispatch } from '../../hooks/useProduktAuswahlDispatch';
import * as catalogApi from '../../lib/api/catalog';
import { D } from '@sanime/design-system';
import type { Kategorie } from '../../lib/api/catalog';
import type { Produkt } from '@sanime/domain';

// Reines Browsing: startet bewusst KEINE OnboardingSession (kein starten()) —
// erst die "Diese Versorgung wählen"-CTA tut das, über useProduktAuswahlDispatch.
// Erreichbar sowohl direkt vom Dashboard als auch mit vorbelegter categoryId
// aus der Krankheitsbild-Empfehlung (Phase 2).
export default function KatalogScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ categoryId?: string }>();
  const waehleProdukt = useProduktAuswahlDispatch();

  const [kategorien, setKategorien] = useState<Kategorie[]>([]);
  const [aktiveKategorieId, setAktiveKategorieId] = useState<string | null>(params.categoryId ?? null);
  const [suchtext, setSuchtext] = useState('');
  const [produkte, setProdukte] = useState<Produkt[]>([]);
  const [ladeFehler, setLadeFehler] = useState(false);
  const [ladend, setLadend] = useState(true);
  const [auswahlLaeuft, setAuswahlLaeuft] = useState<string | null>(null);

  useEffect(() => {
    catalogApi.listCategories().then(setKategorien).catch(() => setKategorien([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    // Reaktion auf geänderte Filter (Kategorie/Suchtext), nicht auf einen
    // externen Systemwert — daher direkt am Effekt-Anfang statt in einem Callback.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLadend(true);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLadeFehler(false);
    const timeout = setTimeout(() => {
      catalogApi
        .listProducts({ categoryId: aktiveKategorieId ?? undefined, q: suchtext.trim() || undefined })
        .then((res) => {
          if (!cancelled) setProdukte(res);
        })
        .catch(() => {
          if (!cancelled) setLadeFehler(true);
        })
        .finally(() => {
          if (!cancelled) setLadend(false);
        });
    }, 250); // leichtes Debounce für die Freitextsuche
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [aktiveKategorieId, suchtext]);

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
      <ScreenHeader title="Katalog durchsuchen" onBack={() => router.back()} />

      <ScrollContainer contentContainerStyle={styles.scrollContent}>
        <Animated.View entering={FadeInDown.delay(40).springify()}>
          <FormField
            label="Suche"
            value={suchtext}
            onChangeText={setSuchtext}
            placeholder="z. B. Rollstuhl, Gehstock…"
            accessibilityHint="Durchsucht Produktname und Beschreibung"
          />
        </Animated.View>

        {kategorien.length > 0 && (
          <Animated.View entering={FadeInDown.delay(80).springify()}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.kategorienRow}
            >
              <TouchableOpacity
                onPress={() => setAktiveKategorieId(null)}
                style={[styles.kategorieChip, !aktiveKategorieId && styles.kategorieChipAktiv]}
                accessibilityRole="button"
                accessibilityState={{ selected: !aktiveKategorieId }}
              >
                <Text style={[styles.kategorieText, !aktiveKategorieId && styles.kategorieTextAktiv]}>Alle</Text>
              </TouchableOpacity>
              {kategorien.map((kategorie) => {
                const aktiv = kategorie.id === aktiveKategorieId;
                return (
                  <TouchableOpacity
                    key={kategorie.id}
                    onPress={() => setAktiveKategorieId(kategorie.id)}
                    style={[styles.kategorieChip, aktiv && styles.kategorieChipAktiv]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: aktiv }}
                  >
                    <Text style={[styles.kategorieText, aktiv && styles.kategorieTextAktiv]}>{kategorie.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Animated.View>
        )}

        {ladend && (
          <View style={styles.mittigBlock}>
            <ActivityIndicator color={D.color.accent} />
          </View>
        )}

        {!ladend && ladeFehler && (
          <View style={styles.mittigBlock}>
            <Feather name="wifi-off" size={22} color={D.color.inkTertiary} />
            <Text style={styles.hinweisText}>
              Der Katalog konnte nicht geladen werden. Bitte überprüfe deine Verbindung und versuche es erneut.
            </Text>
          </View>
        )}

        {!ladend && !ladeFehler && produkte.length === 0 && (
          <View style={styles.mittigBlock}>
            <Feather name="search" size={22} color={D.color.inkTertiary} />
            <Text style={styles.hinweisText}>Keine Treffer. Versuche einen anderen Suchbegriff.</Text>
          </View>
        )}

        {!ladend &&
          produkte.map((produkt, i) => (
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

        <View style={{ height: 40 }} />
      </ScrollContainer>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 16, gap: 12 },
  kategorienRow: { gap: 8, paddingRight: 16 },
  kategorieChip: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: D.radius.full,
    backgroundColor: D.color.bgSoft, borderWidth: 1, borderColor: D.color.glassBorder,
    minHeight: 44, justifyContent: 'center',
  },
  kategorieChipAktiv: { backgroundColor: D.color.accent, borderColor: D.color.accent },
  kategorieText: { fontSize: D.font.sm, fontWeight: D.font.semibold, color: D.color.inkSecondary },
  kategorieTextAktiv: { color: D.color.inkInverted },
  mittigBlock: { alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 40 },
  hinweisText: { fontSize: D.font.sm, color: D.color.inkSecondary, textAlign: 'center', paddingHorizontal: 24, lineHeight: 19 },
  waehlenButton: {
    marginTop: -4, marginBottom: 8, height: 52, borderRadius: D.radius.lg,
    backgroundColor: D.color.accent, alignItems: 'center', justifyContent: 'center',
  },
  waehlenButtonLabel: { fontSize: D.font.md, fontWeight: D.font.bold, color: D.color.inkInverted },
});
