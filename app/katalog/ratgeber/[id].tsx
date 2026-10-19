import React, { useEffect, useState } from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { D, typography } from '@sanime/design-system';
import type { QaEintragMitProdukten } from '@sanime/domain';
import { Screen } from '../../../components/ui/Screen';
import { ScrollContainer } from '../../../components/ui/ScrollContainer';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { GlassCard } from '../../../components/ui/GlassCard';
import { RatgeberText } from '../../../components/katalog/RatgeberText';
import { AbschnittTitel, KatalogHinweis, KatalogLaden } from '../../../components/katalog/KatalogKarten';
import { KatalogProduktKarte } from '../../../components/produkt/KatalogProduktKarte';
import * as qaApi from '../../../lib/api/qa';

// Ein Ratgeber-Eintrag: eigene Worte, sichtbare Quellen und Prüfdatum, fester
// Hinweis „ersetzt keine ärztliche Beratung“, darunter verknüpfte Produkte.
// `id` ist der slug des Eintrags.
export default function RatgeberScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [eintrag, setEintrag] = useState<QaEintragMitProdukten | null>(null);
  const [fehler, setFehler] = useState(false);

  useEffect(() => {
    let abgebrochen = false;
    qaApi
      .getQa(id)
      .then((e) => !abgebrochen && setEintrag(e))
      .catch(() => !abgebrochen && setFehler(true));
    return () => {
      abgebrochen = true;
    };
  }, [id]);

  return (
    <Screen edges={['top', 'bottom']}>
      <ScreenHeader title="Ratgeber" onBack={() => router.back()} />
      <ScrollContainer contentContainerStyle={styles.inhalt}>
        {fehler ? (
          <KatalogHinweis
            icon="wifi-off"
            text="Dieser Eintrag konnte nicht geladen werden. Bitte überprüfe deine Verbindung und versuche es erneut."
            aktion={{ label: 'Zurück', onPress: () => router.back() }}
          />
        ) : !eintrag ? (
          <KatalogLaden />
        ) : (
          <>
            <Text style={styles.frage} accessibilityRole="header">
              {eintrag.frage}
            </Text>
            {!!eintrag.kurzantwort && <Text style={styles.kurz}>{eintrag.kurzantwort}</Text>}
            <RatgeberText text={eintrag.antwort} />

            <GlassCard padding={14} radius={D.radius.md}>
              <View style={styles.hinweisZeile}>
                <Feather name="info" size={18} color={D.color.accent} />
                <Text style={styles.hinweis}>Allgemeine Information, ersetzt keine ärztliche Beratung.</Text>
              </View>
              <Text style={styles.meta}>
                {eintrag.geprueftAm
                  ? `Redaktionell geprüft am ${new Date(eintrag.geprueftAm).toLocaleDateString('de-DE')}`
                  : 'Noch nicht redaktionell geprüft (Platzhalter-Inhalt).'}
              </Text>
            </GlassCard>

            {eintrag.quellen.length > 0 && (
              <>
                <AbschnittTitel titel="Quellen" />
                {eintrag.quellen.map((q) => (
                  <TouchableOpacity
                    key={q.url + q.titel}
                    onPress={() => Linking.openURL(q.url)}
                    style={styles.quelle}
                    accessibilityRole="link"
                    accessibilityHint="Öffnet die Quelle im Browser"
                  >
                    <Feather name="external-link" size={16} color={D.color.accent} />
                    <Text style={styles.quelleText}>{q.titel}</Text>
                  </TouchableOpacity>
                ))}
              </>
            )}

            {eintrag.produkte.length > 0 && (
              <>
                <AbschnittTitel titel="Passende Produkte" />
                {eintrag.produkte.map((p, i) => (
                  <KatalogProduktKarte
                    key={p.id}
                    produkt={p}
                    index={i}
                    onPress={() => router.push({ pathname: '/katalog/produkt/[id]', params: { id: p.id } })}
                  />
                ))}
              </>
            )}
          </>
        )}
        <View style={styles.ende} />
      </ScrollContainer>
    </Screen>
  );
}

const styles = StyleSheet.create({
  inhalt: { padding: 16, gap: 12 },
  frage: { ...typography.title, color: D.color.ink },
  kurz: { ...typography.headline, color: D.color.inkSecondary },
  hinweisZeile: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  hinweis: { ...typography.body, color: D.color.ink, flex: 1 },
  meta: { ...typography.caption, color: D.color.inkSecondary, marginTop: 8 },
  quelle: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48 },
  quelleText: { ...typography.body, color: D.color.accent, flex: 1 },
  ende: { height: 40 },
});
