import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { D, typography } from '@sanime/design-system';
import { BEDARF_KATALOG, KRANKHEITSBILD_KATALOG, type HilfeTreffer } from '@sanime/domain';
import * as catalogApi from '../../lib/api/catalog';
import type { Kategorie } from '../../lib/api/catalog';

import { AbschnittTitel, KatalogHinweis, KatalogKarte, KatalogLaden, KATALOG_LADEFEHLER } from './KatalogKarten';
import { KatalogSuchfeld } from './KatalogSuchfeld';

// Je Gruppe sichtbare Karten vor „Alle anzeigen“.
const HILFE_VORSCHAU = 4;

// Katalog-Start, gerendert im Entdecken-Tab und unter /katalog (Einstieg aus
// Vollbild-Modals). Drei gleichwertige Zugänge in fester Reihenfolge: Suche
// (mit Mikrofon) → „Wobei brauchst du Hilfe?“ → Kategorien. Keine horizontalen
// Scroller (Wischgeste der Start-Tabs). Sessionlos: nichts hier ruft starten() —
// erst „Zur Kasse“ im Warenkorb beginnt einen Prozess.
export function KatalogStart() {
  const router = useRouter();
  const [kategorien, setKategorien] = useState<Kategorie[]>([]);
  const [ladend, setLadend] = useState(true);
  const [fehler, setFehler] = useState(false);
  const [versuch, setVersuch] = useState(0);




  useEffect(() => {
    let abgebrochen = false;
    catalogApi
      .listCategories()
      .then((k) => {
        if (abgebrochen) return;
        setKategorien(k);
        setFehler(false);
      })
      .catch(() => !abgebrochen && setFehler(true))
      .finally(() => !abgebrochen && setLadend(false));
    return () => {
      abgebrochen = true;
    };
  }, [versuch]);



 

  const hauptkategorien = kategorien.filter((k) => k.parentId === null);
  const zuHilfe = (t: Pick<HilfeTreffer, 'typ' | 'id'>) =>
    router.push({ pathname: '/katalog/hilfe/[typ]/[id]', params: { typ: t.typ, id: t.id } });

  return (
    <View style={styles.wrap}>
      <KatalogSuchfeld
        kategorien={kategorien}
        onSuche={(q) => router.push({ pathname: '/katalog/suche', params: { q } })}
        onHilfe={zuHilfe}
        onKategorie={(id) => router.push({ pathname: '/katalog/kategorie/[id]', params: { id } })}
      />
      <AbschnittTitel titel="Kategorien" />
      {ladend ? (
        <KatalogLaden />
      ) : fehler ? (
        <KatalogHinweis
          icon="wifi-off"
          text={KATALOG_LADEFEHLER}
          aktion={{
            label: 'Erneut versuchen',
            onPress: () => {
              setLadend(true);
              setVersuch((v) => v + 1);
            },
          }}
        />
      ) : (
        hauptkategorien.map((k, i) => (
          <KatalogKarte
            key={k.id}
            icon={k.icon}
            titel={k.name}
            untertitel={k.beschreibung}
            index={i}
            onPress={() => router.push({ pathname: '/katalog/kategorie/[id]', params: { id: k.id } })}
          />
        ))
      )}

      <AbschnittTitel
        titel="Wobei brauchst du Hilfe?"
        aktion={{ label: 'Alle anzeigen', onPress: () => router.push('/katalog/hilfe') }}
      />
      <Text style={styles.gruppe}>Im Alltag</Text>
      {BEDARF_KATALOG.slice(0, HILFE_VORSCHAU).map((b, i) => (
        <KatalogKarte
          key={b.id}
          icon={b.icon}
          titel={b.titel}
          index={i}
          onPress={() => zuHilfe({ typ: 'bedarf', id: b.id })}
          accessibilityHint="Zeigt passende Hilfsmittel"
        />
      ))}
      <Text style={styles.gruppe}>Bei Erkrankungen</Text>
      {KRANKHEITSBILD_KATALOG.slice(0, HILFE_VORSCHAU - 1).map((kb, i) => (
        <KatalogKarte
          key={kb.id}
          icon={kb.icon}
          titel={kb.bezeichnung}
          index={i}
          onPress={() => zuHilfe({ typ: 'krankheitsbild', id: kb.id })}
          accessibilityHint="Zeigt passende Hilfsmittel"
        />
      ))}

     

     

      <Text style={styles.platzhalter}>Alle Katalogdaten sind Platzhalter während der Entwicklung.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  gruppe: { ...typography.caption, color: D.color.inkSecondary, fontWeight: D.font.semibold, marginTop: 2 },
  platzhalter: { ...typography.caption, color: D.color.inkSecondary, textAlign: 'center', marginTop: 12 },
});
