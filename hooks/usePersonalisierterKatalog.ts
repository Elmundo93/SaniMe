import { useEffect, useState } from 'react';
import type { KatalogKategorie, PassendeProdukte, ProduktDetail } from '@sanime/domain';
import * as catalogApi from '../lib/api/catalog';
import { baueVorschlaege, quellVersorgungen, type PersonalisierterKatalog } from '../lib/personalisierterKatalog';
import { useAuthStore } from '../store/authStore';
import { useVersorgungStore } from '../store/versorgungStore';

// Wie viele Versorgungen als Quelle dienen — genug für Abwechslung, ohne den
// Katalog-Start mit Anfragen zu bremsen.
const MAX_QUELLEN = 4;

const LEER: PersonalisierterKatalog = { produkte: [], kategorien: [] };

// Lädt Produktdetails und passendes Zubehör der eigenen Versorgungen über die
// öffentlichen Katalog-Endpunkte. Fehler sind still: der personalisierte Teil
// ist eine Ergänzung, der normale Katalog funktioniert ohne ihn.
export function usePersonalisierterKatalog(kategorien: KatalogKategorie[]): PersonalisierterKatalog {
  const istKunde = useAuthStore((s) => !!s.benutzer);
  const versorgungen = useVersorgungStore((s) => s.versorgungen);
  const [ergebnis, setErgebnis] = useState<PersonalisierterKatalog>(LEER);
  const schluessel = quellVersorgungen(versorgungen)
    .slice(0, MAX_QUELLEN)
    .map((v) => v.produktId)
    .join(',');

  useEffect(() => {
    if (!istKunde || !schluessel || kategorien.length === 0) return;
    let abgebrochen = false;
    (async () => {
      const ids = schluessel.split(',');
      const details = new Map<string, ProduktDetail>();
      const passend = new Map<string, PassendeProdukte>();
      await Promise.all(
        ids.map(async (id) => {
          const [detail, related] = await Promise.allSettled([catalogApi.getProduct(id), catalogApi.listRelated(id)]);
          if (detail.status === 'fulfilled') details.set(id, detail.value);
          if (related.status === 'fulfilled') passend.set(id, related.value);
        }),
      );
      if (!abgebrochen) setErgebnis(baueVorschlaege(useVersorgungStore.getState().versorgungen, details, passend, kategorien));
    })();
    return () => {
      abgebrochen = true;
    };
  }, [istKunde, schluessel, kategorien]);

  return istKunde && schluessel ? ergebnis : LEER;
}
