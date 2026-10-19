import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { D, typography } from '@sanime/design-system';
import { findeHilfe, schreibvorschlag, type HilfeTreffer, type QaEintrag } from '@sanime/domain';
import { Screen } from '../../components/ui/Screen';
import { ScrollContainer } from '../../components/ui/ScrollContainer';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { KatalogSuchfeld } from '../../components/katalog/KatalogSuchfeld';
import { QaListe } from '../../components/katalog/QaListe';
import {
  AbschnittTitel,
  KatalogHinweis,
  KatalogKarte,
  KatalogLaden,
  KATALOG_LADEFEHLER,
} from '../../components/katalog/KatalogKarten';
import { KatalogProduktKarte } from '../../components/produkt/KatalogProduktKarte';
import { useKatalogSuche } from '../../hooks/useKatalogSuche';
import * as catalogApi from '../../lib/api/catalog';
import type { Kategorie } from '../../lib/api/catalog';
import * as qaApi from '../../lib/api/qa';
import { anzahlText } from '../../lib/katalogAnzeige';

// Trefferliste zu Suchtext bzw. bestätigtem Sprach-Transkript. Null Treffer
// führt nie in eine Sackgasse: Schreibvorschlag, passende Hilfe-Themen,
// Ratgeber-Einträge und alle Kategorien.
export default function SucheScreen() {
  const router = useRouter();
  const { q = '' } = useLocalSearchParams<{ q?: string }>();
  const suchtext = q.trim();
  const { produkte, ladend, fehler, erneutVersuchen } = useKatalogSuche(suchtext ? { q: suchtext } : null);
  const [kategorien, setKategorien] = useState<Kategorie[]>([]);
  const [ratgeber, setRatgeber] = useState<QaEintrag[]>([]);

  useEffect(() => {
    catalogApi.listCategories().then(setKategorien).catch(() => setKategorien([]));
  }, []);

  useEffect(() => {
    if (!suchtext) return;
    let abgebrochen = false;
    qaApi
      .listQa({ q: suchtext })
      .then((r) => !abgebrochen && setRatgeber(r))
      .catch(() => !abgebrochen && setRatgeber([]));
    return () => {
      abgebrochen = true;
    };
  }, [suchtext]);

  const neueSuche = (text: string) => router.setParams({ q: text });
  const zuHilfe = (t: Pick<HilfeTreffer, 'typ' | 'id'>) =>
    router.push({ pathname: '/katalog/hilfe/[typ]/[id]', params: { typ: t.typ, id: t.id } });
  const vorschlag = schreibvorschlag(suchtext);
  const hilfeTreffer = findeHilfe(suchtext).slice(0, 3);
  const keineTreffer = !ladend && !fehler && produkte.length === 0;

  return (
    <Screen edges={['top', 'bottom']}>
      <ScreenHeader title="Suche" onBack={() => router.back()} />
      <ScrollContainer contentContainerStyle={styles.inhalt}>
        <KatalogSuchfeld
          key={suchtext}
          kategorien={kategorien}
          anfangsText={suchtext}
          onSuche={neueSuche}
          onHilfe={zuHilfe}
          onKategorie={(id) => router.push({ pathname: '/katalog/kategorie/[id]', params: { id } })}
        />

        {ladend && <KatalogLaden />}
        {!ladend && fehler && (
          <KatalogHinweis icon="wifi-off" text={KATALOG_LADEFEHLER} aktion={{ label: 'Erneut versuchen', onPress: erneutVersuchen }} />
        )}

        {!ladend && !fehler && produkte.length > 0 && (
          <>
            <Text style={styles.anzahl} accessibilityRole="header">
              {anzahlText(produkte.length, 'Produkt', 'Produkte')} zu „{suchtext}“
            </Text>
            {produkte.map((p, i) => (
              <KatalogProduktKarte
                key={p.id}
                produkt={p}
                index={i}
                onPress={() => router.push({ pathname: '/katalog/produkt/[id]', params: { id: p.id } })}
              />
            ))}
          </>
        )}

        {keineTreffer && (
          <>
            <KatalogHinweis icon="search" text={`Zu „${suchtext}“ haben wir kein Produkt gefunden.`} />
            {vorschlag && (
              <TouchableOpacity onPress={() => neueSuche(vorschlag)} style={styles.vorschlag} accessibilityRole="button">
                <Text style={styles.vorschlagText}>
                  Meintest du <Text style={styles.vorschlagBegriff}>„{vorschlag}“</Text>?
                </Text>
              </TouchableOpacity>
            )}
            {hilfeTreffer.length > 0 && <AbschnittTitel titel="Passt vielleicht" />}
            {hilfeTreffer.map((t, i) => (
              <KatalogKarte key={`${t.typ}-${t.id}`} icon={t.icon} titel={t.titel} index={i} onPress={() => zuHilfe(t)} />
            ))}
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

        {keineTreffer && (
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
  anzahl: { ...typography.body, fontWeight: D.font.semibold, color: D.color.inkSecondary, marginTop: 4 },
  vorschlag: { minHeight: 48, justifyContent: 'center', alignItems: 'center' },
  vorschlagText: { ...typography.body, color: D.color.ink },
  vorschlagBegriff: { fontWeight: D.font.bold, color: D.color.accent },
  ende: { height: 40 },
});
