import { useRouter } from 'expo-router';
import type { ClientOnboardingEvent, Produkt } from '@sanime/domain';
import { useOnboardingStore, STATUS_META } from '../store/onboardingStore';
import { zeigeDispatchFehler } from '../lib/onboardingNav';

// Geteilte "Produkt aus Katalog/Krankheitsbild-Empfehlung wählen"-Logik —
// startet/holt eine Session, wählt anhand von hilfsmittelNr das richtige
// FSM-Event (Kassenprodukt vs. Selbstzahler) und navigiert zum Ergebnis-Status.
// `herkunft` wählt zwischen den beiden Event-Paaren (KATALOG_* bzw.
// KRANKHEITSBILD_*) — sonst identisches Verhalten.
// Eine ganz frische Session steht immer bei WILLKOMMEN/LEISTUNGSUEBERSICHT,
// bevor AGB/Datenschutz akzeptiert sind — die VORGEMERKT/GEWAEHLT-Events
// haben aber nur Übergangsregeln ab LEISTUNGSUEBERSICHT mit erteilter
// Einwilligung. Statt hier fehlzuschlagen, wird die Auswahl im Store gemerkt
// und nach Einwilligung von leistungsuebersicht.tsx nachgeholt (siehe dort).
// (Für die Krankheitsbild-Herkunft ist dieser Zweig praktisch nie erreichbar,
// da KRANKHEITSBILD_EMPFEHLUNG selbst erst nach erteilter Einwilligung
// erreichbar ist — trotzdem korrekt für beide Herkünfte implementiert.)
export function useProduktAuswahlDispatch(herkunft: 'katalog' | 'krankheitsbild' = 'katalog') {
  const router = useRouter();

  return async function waehleProdukt(produkt: Produkt): Promise<void> {
    const session = await useOnboardingStore.getState().starten();
    const event: ClientOnboardingEvent =
      herkunft === 'katalog'
        ? produkt.hilfsmittelNr
          ? { type: 'KATALOG_PRODUKT_VORGEMERKT', produktId: produkt.id }
          : { type: 'KATALOG_PRODUKT_SELBSTZAHLER_GEWAEHLT', produkt }
        : produkt.hilfsmittelNr
          ? { type: 'KRANKHEITSBILD_PRODUKT_VORGEMERKT', produktId: produkt.id }
          : { type: 'KRANKHEITSBILD_PRODUKT_SELBSTZAHLER_GEWAEHLT', produkt };

    if (session.status === 'WILLKOMMEN' || session.status === 'LEISTUNGSUEBERSICHT') {
      useOnboardingStore.getState().setPendingEinstiegEvent(event);
      router.push(STATUS_META[session.status].route as any);
      return;
    }

    const result = await useOnboardingStore.getState().dispatch(event);
    if (result.ok) {
      router.push(STATUS_META[result.session.status].route as any);
    } else {
      zeigeDispatchFehler();
    }
  };
}
