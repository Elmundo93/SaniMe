import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import type { Produkt } from '@sanime/domain';
import * as catalogApi from '../lib/api/catalog';
import type { ListProductsFilters } from '../lib/api/catalog';
import { anzahlText } from '../lib/katalogAnzeige';

const DEBOUNCE_MS = 250;

// Lädt eine Produktliste zu den gegebenen Filtern — mit leichtem Debounce,
// Abbruch veralteter Antworten und Lade-/Fehlerzustand. Kündigt das Ergebnis
// für Screenreader an („12 Produkte gefunden“). `null` als Filter = nichts laden
// (z. B. Hauptkategorie ohne Produktliste).
export function useKatalogSuche(filter: ListProductsFilters | null) {
  const [produkte, setProdukte] = useState<Produkt[]>([]);
  const [ladend, setLadend] = useState(filter !== null);
  const [fehler, setFehler] = useState(false);
  const [neuLaden, setNeuLaden] = useState(0);
  const schluessel = filter ? JSON.stringify(filter) : null;

  useEffect(() => {
    if (schluessel === null) return;
    let abgebrochen = false;
    // Reaktion auf geänderte Filter, nicht auf einen externen Systemwert.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLadend(true);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFehler(false);
    const timeout = setTimeout(() => {
      catalogApi
        .listProducts(JSON.parse(schluessel) as ListProductsFilters)
        .then((res) => {
          if (abgebrochen) return;
          setProdukte(res);
          AccessibilityInfo.announceForAccessibility(
            res.length === 0 ? 'Keine Produkte gefunden' : `${anzahlText(res.length, 'Produkt', 'Produkte')} gefunden`,
          );
        })
        .catch(() => {
          if (!abgebrochen) setFehler(true);
        })
        .finally(() => {
          if (!abgebrochen) setLadend(false);
        });
    }, DEBOUNCE_MS);
    return () => {
      abgebrochen = true;
      clearTimeout(timeout);
    };
  }, [schluessel, neuLaden]);

  return { produkte, ladend, fehler, erneutVersuchen: () => setNeuLaden((n) => n + 1) };
}
