import { useEffect, useState } from 'react';
import { getAngebot } from '../lib/api/catalog';

// Einmal pro App-Lauf geladen und geteilt (Dashboard, Einstieg, Willkommen,
// Kasse fragen dasselbe). Fehler → null: die App zeigt dann den Rezept-Weg wie
// bisher, der Server lehnt ihn ohne Kassenartikel mit einer klaren Meldung ab.
let angebot: Promise<boolean | null> | null = null;

function ladeRezeptVersorgung(): Promise<boolean | null> {
  angebot ??= getAngebot()
    .then((a) => a.rezeptVersorgung)
    .catch(() => {
      angebot = null; // beim nächsten Bildschirm erneut versuchen
      return null;
    });
  return angebot;
}

/** true/false sobald bekannt, null solange unbekannt (lädt oder offline). */
export function useRezeptVersorgung(): boolean | null {
  const [verfuegbar, setVerfuegbar] = useState<boolean | null>(null);
  useEffect(() => {
    let aktiv = true;
    ladeRezeptVersorgung().then((wert) => {
      if (aktiv) setVerfuegbar(wert);
    });
    return () => {
      aktiv = false;
    };
  }, []);
  return verfuegbar;
}
