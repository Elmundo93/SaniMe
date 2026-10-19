import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { D, typography } from '@sanime/design-system';
import { filterFuerKategorie, type QaEintrag } from '@sanime/domain';
import { Screen } from '../../../components/ui/Screen';
import { ScrollContainer } from '../../../components/ui/ScrollContainer';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { ProduktFilter } from '../../../components/katalog/ProduktFilter';
import { QaListe } from '../../../components/katalog/QaListe';
import {
  AbschnittTitel,
  KatalogHinweis,
  KatalogKarte,
  KatalogLaden,
  KATALOG_LADEFEHLER,
} from '../../../components/katalog/KatalogKarten';
import { KatalogProduktKarte } from '../../../components/produkt/KatalogProduktKarte';
import { useKatalogSuche } from '../../../hooks/useKatalogSuche';
import * as catalogApi from '../../../lib/api/catalog';
import type { Kategorie } from '../../../lib/api/catalog';
import * as qaApi from '../../../lib/api/qa';
import { anzahlText } from '../../../lib/katalogAnzeige';

// Filter werden zusätzlich als Router-Param gespiegelt („faltbar=true&gewichtKg=8“),
// damit Deep Links und ein App-Neustart sie behalten. Beim Zurück von der
// Detailseite bleibt ohnehin der lokale State erhalten (Push darüber).
function leseFilterParam(param: string | undefined): Record<string, string> {
  return param ? Object.fromEntries(new URLSearchParams(param)) : {};
}

// Hauptkategorie → Liste ihrer Unterkategorien (reine Navigation).
// Unterkategorie → Produktliste mit kontextabhängigen Filtern. Max. zwei Ebenen.
export default function KategorieScreen() {
  const router = useRouter();
  const { id, filter: filterParam } = useLocalSearchParams<{ id: string; filter?: string }>();
  const [kategorien, setKategorien] = useState<Kategorie[] | null>(null);
  const [ladeFehler, setLadeFehler] = useState(false);
  const [filter, setFilter] = useState<Record<string, string>>(() => leseFilterParam(filterParam));
  const [ratgeber, setRatgeber] = useState<QaEintrag[]>([]);

  useEffect(() => {
    catalogApi
      .listCategories()
      .then(setKategorien)
      .catch(() => setLadeFehler(true));
  }, []);

  useEffect(() => {
    let abgebrochen = false;
    qaApi
      .listQa({ categoryId: id })
      .then((r) => !abgebrochen && setRatgeber(r))
      .catch(() => !abgebrochen && setRatgeber([]));
    return () => {
      abgebrochen = true;
    };
  }, [id]);

  const kategorie = kategorien?.find((k) => k.id === id);
  const kinder = kategorien?.filter((k) => k.parentId === id) ?? [];
  const istHaupt = !!kategorie && kategorie.parentId === null && kinder.length > 0;
  const definitionen = filterFuerKategorie(kategorie?.slug);
  const { produkte, ladend, fehler, erneutVersuchen } = useKatalogSuche(
    kategorie && !istHaupt ? { categoryId: kategorie.id, filter } : null,
  );

  const filterAendern = (neu: Record<string, string>) => {
    setFilter(neu);
    router.setParams({ filter: new URLSearchParams(neu).toString() || undefined });
  };
  const oeffneRatgeber = (e: QaEintrag) => router.push({ pathname: '/katalog/ratgeber/[id]', params: { id: e.slug } });

  return (
    <Screen edges={['top', 'bottom']}>
      <ScreenHeader title={kategorie?.name ?? 'Kategorie'} onBack={() => router.back()} />
      <ScrollContainer contentContainerStyle={styles.inhalt}>
        {ladeFehler ? (
          <KatalogHinweis icon="wifi-off" text={KATALOG_LADEFEHLER} />
        ) : !kategorien ? (
          <KatalogLaden />
        ) : !kategorie ? (
          <KatalogHinweis
            icon="alert-circle"
            text="Diese Kategorie gibt es nicht mehr. Bitte wähle eine andere."
            aktion={{ label: 'Zum Katalog', onPress: () => router.replace('/katalog') }}
          />
        ) : istHaupt ? (
          <>
            {!!kategorie.beschreibung && <Text style={styles.beschreibung}>{kategorie.beschreibung}</Text>}
            {kinder.map((k, i) => (
              <KatalogKarte
                key={k.id}
                icon={k.icon}
                titel={k.name}
                untertitel={k.beschreibung}
                index={i}
                onPress={() => router.push({ pathname: '/katalog/kategorie/[id]', params: { id: k.id } })}
              />
            ))}
          </>
        ) : (
          <>
            {definitionen.length > 0 && <ProduktFilter definitionen={definitionen} aktiv={filter} onAendern={filterAendern} />}
            {ladend && <KatalogLaden />}
            {!ladend && fehler && (
              <KatalogHinweis icon="wifi-off" text={KATALOG_LADEFEHLER} aktion={{ label: 'Erneut versuchen', onPress: erneutVersuchen }} />
            )}
            {!ladend && !fehler && produkte.length === 0 && (
              <KatalogHinweis
                icon="filter"
                text={
                  Object.keys(filter).length > 0
                    ? 'Mit diesen Filtern passt kein Produkt. Entferne einen Filter, um mehr zu sehen.'
                    : 'In dieser Kategorie gibt es gerade keine Produkte.'
                }
                aktion={Object.keys(filter).length > 0 ? { label: 'Alle Filter zurücksetzen', onPress: () => filterAendern({}) } : undefined}
              />
            )}
            {!ladend && !fehler && produkte.length > 0 && (
              <>
                <Text style={styles.anzahl} accessibilityLiveRegion="polite">
                  {anzahlText(produkte.length, 'Produkt', 'Produkte')}
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
          </>
        )}

        {ratgeber.length > 0 && (
          <>
            <AbschnittTitel titel="Häufige Fragen" />
            <QaListe eintraege={ratgeber} max={3} onOeffnen={oeffneRatgeber} />
          </>
        )}
        <View style={styles.ende} />
      </ScrollContainer>
    </Screen>
  );
}

const styles = StyleSheet.create({
  inhalt: { padding: 16, gap: 12 },
  beschreibung: { ...typography.body, color: D.color.inkSecondary },
  anzahl: { ...typography.body, fontWeight: D.font.semibold, color: D.color.inkSecondary },
  ende: { height: 40 },
});
