import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { D, typography } from '@sanime/design-system';
import { findeBedarf, findeKrankheitsbild, type Produkt, type QaEintrag } from '@sanime/domain';
import { Screen } from '../../../../components/ui/Screen';
import { ScrollContainer } from '../../../../components/ui/ScrollContainer';
import { ScreenHeader } from '../../../../components/ui/ScreenHeader';
import { QaListe } from '../../../../components/katalog/QaListe';
import {
  AbschnittTitel,
  KatalogHinweis,
  KatalogKarte,
  KatalogLaden,
  KATALOG_LADEFEHLER,
} from '../../../../components/katalog/KatalogKarten';
import { KatalogProduktKarte } from '../../../../components/produkt/KatalogProduktKarte';
import { useKatalogSuche } from '../../../../hooks/useKatalogSuche';
import * as catalogApi from '../../../../lib/api/catalog';
import type { Kategorie } from '../../../../lib/api/catalog';
import * as qaApi from '../../../../lib/api/qa';

// Passende Produkte zu einem Bedarf bzw. Krankheitsbild — sessionlos, der Server
// bleibt Autorität über die Zuordnung (GET /products?bedarfId|krankheitsbildId).
// Produkte nach Kategorie gruppiert, darunter verknüpfte Ratgeber-Einträge. Ist
// die Liste trotzdem leer (z. B. alles deaktiviert), Ratgeber + Kategorien statt
// einer Sackgasse. Nur die bestätigte ID geht ans Backend, nie ein Freitext.
export default function HilfeScreen() {
  const router = useRouter();
  const { typ, id } = useLocalSearchParams<{ typ: 'bedarf' | 'krankheitsbild'; id: string }>();
  const istBedarf = typ === 'bedarf';
  const bedarf = istBedarf ? findeBedarf(id) : undefined;
  const krankheitsbild = !istBedarf ? findeKrankheitsbild(id) : undefined;
  const titel = bedarf?.titel ?? krankheitsbild?.bezeichnung;
  const bekannt = !!titel;

  const { produkte, ladend, fehler, erneutVersuchen } = useKatalogSuche(
    bekannt ? (istBedarf ? { bedarfId: id } : { krankheitsbildId: id }) : null,
  );
  const [ratgeber, setRatgeber] = useState<QaEintrag[]>([]);
  const [kategorien, setKategorien] = useState<Kategorie[]>([]);

  useEffect(() => {
    if (!bekannt) return;
    let abgebrochen = false;
    qaApi
      .listQa(istBedarf ? { bedarfId: id } : { krankheitsbildId: id })
      .then((r) => !abgebrochen && setRatgeber(r))
      .catch(() => !abgebrochen && setRatgeber([]));
    catalogApi
      .listCategories()
      .then((k) => !abgebrochen && setKategorien(k))
      .catch(() => {});
    return () => {
      abgebrochen = true;
    };
  }, [bekannt, istBedarf, id]);

  const gruppen = produkte.reduce<Map<string, Produkt[]>>((acc, p) => {
    acc.set(p.kategorie, [...(acc.get(p.kategorie) ?? []), p]);
    return acc;
  }, new Map());
  const zuProdukt = (p: Produkt) =>
    router.push({
      pathname: '/katalog/produkt/[id]',
      // Krankheitsbild als Kontext für die spätere Wahl (Admin-Sichtbarkeit).
      params: krankheitsbild ? { id: p.id, krankheitsbildId: krankheitsbild.id } : { id: p.id },
    });

  return (
    <Screen edges={['top', 'bottom']}>
      <ScreenHeader title={titel ?? 'Hilfe finden'} onBack={() => router.back()} />
      <ScrollContainer contentContainerStyle={styles.inhalt}>
        {!bekannt ? (
          <KatalogHinweis
            icon="alert-circle"
            text="Dieses Thema gibt es nicht mehr. Bitte wähle ein anderes."
            aktion={{ label: 'Zur Übersicht', onPress: () => router.replace('/katalog/hilfe') }}
          />
        ) : (
          <>
            <Text style={styles.sub}>
              {bedarf
                ? `Hilfsmittel, die bei „${bedarf.titel}“ unterstützen können.`
                : 'Hilfsmittel, die häufig in diesem Zusammenhang genutzt werden. Wir stellen keine Diagnose — sprich bei Fragen mit deiner Ärztin oder deinem Arzt.'}
            </Text>
            {ladend && <KatalogLaden />}
            {!ladend && fehler && (
              <KatalogHinweis icon="wifi-off" text={KATALOG_LADEFEHLER} aktion={{ label: 'Erneut versuchen', onPress: erneutVersuchen }} />
            )}
            {!ladend &&
              !fehler &&
              [...gruppen.entries()].map(([kategorie, liste]) => (
                <View key={kategorie} style={styles.gruppe}>
                  <AbschnittTitel titel={kategorie} />
                  {liste.map((p, i) => (
                    <KatalogProduktKarte key={p.id} produkt={p} index={i} onPress={() => zuProdukt(p)} />
                  ))}
                </View>
              ))}
            {!ladend && !fehler && produkte.length === 0 && (
              <KatalogHinweis icon="search" text="Gerade gibt es dazu keine bestellbaren Produkte. Vielleicht helfen dir die Ratgeber-Einträge oder eine Kategorie weiter." />
            )}
          </>
        )}

        {ratgeber.length > 0 && (
          <>
            <AbschnittTitel titel="Ratgeber" />
            <QaListe
              eintraege={ratgeber}
              max={3}
              onOeffnen={(e) => router.push({ pathname: '/katalog/ratgeber/[id]', params: { id: e.slug } })}
            />
          </>
        )}

        {bekannt && !ladend && !fehler && produkte.length === 0 && (
          <>
            <AbschnittTitel titel="Alle Kategorien" />
            {kategorien
              .filter((k) => k.parentId === null)
              .map((k, i) => (
                <KatalogKarte
                  key={k.id}
                  icon={k.icon}
                  titel={k.name}
                  index={i}
                  onPress={() => router.push({ pathname: '/katalog/kategorie/[id]', params: { id: k.id } })}
                />
              ))}
          </>
        )}
        <View style={styles.ende} />
      </ScrollContainer>
    </Screen>
  );
}

const styles = StyleSheet.create({
  inhalt: { padding: 16, gap: 12 },
  sub: { ...typography.body, color: D.color.inkSecondary },
  gruppe: { gap: 12 },
  ende: { height: 40 },
});
