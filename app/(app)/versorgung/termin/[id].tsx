import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, AccessibilityInfo, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { Screen } from '../../../../components/ui/Screen';
import { ScreenHeader } from '../../../../components/ui/ScreenHeader';
import { ScrollContainer } from '../../../../components/ui/ScrollContainer';
import { GlassCard } from '../../../../components/ui/GlassCard';
import { Button } from '../../../../components/ui/Button';
import { einblenden } from '../../../../lib/einblenden';
import { terminText } from '../../../../lib/versorgungsprozess';
import { terminVorschlaege, terminWaehlen, type TerminVorschlag } from '../../../../lib/api/supply';
import { ApiError } from '../../../../lib/api/client';
import { useVersorgungStore } from '../../../../store/versorgungStore';
import { D } from '@sanime/design-system';

// Liefertermin nach der Genehmigung: echte, freie Termine des Lieferanten —
// der Server bucht nur, was er auch gerade vorschlägt.
export default function VersorgungTerminScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const versorgung = useVersorgungStore((s) => s.versorgungen.find((v) => v.id === id));
  const laden = useVersorgungStore((s) => s.laden);
  const [vorschlaege, setVorschlaege] = useState<TerminVorschlag[] | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [gewaehlt, setGewaehlt] = useState<string | null>(null);
  const [bucht, setBucht] = useState(false);

  const ladeVorschlaege = async () => {
    try {
      setVorschlaege(await terminVorschlaege(id));
    } catch (e) {
      setFehler(
        e instanceof ApiError && e.status < 500
          ? e.message
          : 'Wir konnten gerade keine Termine laden. Bitte prüfe deine Internetverbindung und versuche es noch einmal.',
      );
    }
  };

  const erneutLaden = () => {
    setFehler(null);
    setVorschlaege(null);
    ladeVorschlaege();
  };

  useEffect(() => {
    (async () => {
      await ladeVorschlaege();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const buchen = async () => {
    if (!gewaehlt) return;
    setBucht(true);
    try {
      await terminWaehlen(id, gewaehlt);
      await laden();
      AccessibilityInfo.announceForAccessibility('Liefertermin gebucht');
      router.back();
    } catch (e) {
      const text =
        e instanceof ApiError && e.status < 500 ? e.message : 'Der Termin konnte gerade nicht gebucht werden. Bitte versuche es noch einmal.';
      Alert.alert('Termin nicht gebucht', text);
      if (e instanceof ApiError && e.status === 400) erneutLaden();
    } finally {
      setBucht(false);
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <ScreenHeader title="Liefertermin wählen" onBack={() => router.back()} />
      <ScrollContainer contentContainerStyle={styles.inhalt}>
        <Text style={styles.hinweis}>
          {versorgung?.produkt ? `Wann sollen wir dir „${versorgung.produkt}“ bringen? ` : ''}
          Die Termine richten sich nach Lieferzeit und freien Kapazitäten.
        </Text>

        {fehler && (
          <GlassCard padding={16} radius={D.radius.md}>
            <Text style={styles.fehler}>{fehler}</Text>
            <Button label="Erneut versuchen" variante="secondary" onPress={erneutLaden} style={{ marginTop: 12 }} />
          </GlassCard>
        )}

        {!fehler && vorschlaege === null && <ActivityIndicator style={{ marginTop: 24 }} accessibilityLabel="Termine werden geladen" />}

        {vorschlaege?.length === 0 && (
          <GlassCard padding={16} radius={D.radius.md}>
            <Text style={styles.fehler}>Gerade ist kein Termin frei. Wir melden uns bei dir, um einen Termin abzustimmen.</Text>
          </GlassCard>
        )}

        {vorschlaege?.map((slot, i) => {
          const aktiv = slot.start === gewaehlt;
          const text = terminText({ beginn: slot.start, ende: slot.end });
          return (
            <Animated.View key={slot.start} entering={einblenden(60 + i * 60)}>
              <TouchableOpacity
                onPress={() => {
                  Haptics.selectionAsync();
                  setGewaehlt(slot.start);
                }}
                activeOpacity={0.85}
                accessibilityRole="radio"
                accessibilityState={{ selected: aktiv }}
                accessibilityLabel={i === 0 ? `${text}, frühester Termin` : text}
              >
                <GlassCard padding={16} radius={D.radius.md} style={aktiv ? styles.aktiv : undefined}>
                  <View style={styles.zeile}>
                    <View style={{ flex: 1 }}>
                      {i === 0 && <Text style={styles.frueh}>Frühester Termin</Text>}
                      <Text style={styles.termin}>{text}</Text>
                    </View>
                    <View style={[styles.kreis, aktiv && styles.kreisAktiv]}>{aktiv && <Feather name="check" size={12} color="#fff" />}</View>
                  </View>
                </GlassCard>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
        <View style={{ height: 100 }} />
      </ScrollContainer>
      <View style={styles.footer}>
        <Button label="Termin bestätigen" größe="lg" disabled={!gewaehlt} loading={bucht} onPress={buchen} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  inhalt: { padding: 16, gap: 12 },
  hinweis: { fontSize: D.font.md, color: D.color.inkSecondary, lineHeight: 22, marginBottom: 4 },
  fehler: { fontSize: D.font.md, color: D.color.ink, lineHeight: 22 },
  aktiv: { borderWidth: 1.5, borderColor: D.color.accent } as object,
  zeile: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  frueh: { fontSize: 11, color: D.color.accent, fontWeight: D.font.bold, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  termin: { fontSize: D.font.md, fontWeight: D.font.semibold, color: D.color.ink },
  kreis: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(63,139,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  kreisAktiv: { backgroundColor: D.color.accent, borderColor: D.color.accent },
  footer: { paddingHorizontal: 16, paddingBottom: 8 },
});
