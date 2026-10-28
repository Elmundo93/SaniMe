import { useCallback, useEffect, useRef, useState } from 'react';
import { requireOptionalNativeModule } from 'expo';

type SprachModul = typeof import('expo-speech-recognition');

// Das native Modul ist nur in einem Dev-Client/Build enthalten, der nach dem
// Hinzufügen von expo-speech-recognition neu gebaut wurde — nicht in Expo Go
// und nicht in älteren Dev-Clients. Ein statischer Import würfe dann schon beim
// Laden und risse jeden Screen mit Suchfeld (u. a. den Katalog-Tab) mit. Das
// Mikrofon ist immer nur ein zweiter Weg neben dem Textfeld: fehlt das Modul,
// wird es einfach nicht angeboten.
// Erst prüfen, ob das native Modul existiert — ein Ladefehler des Pakets selbst
// würde Metro im Dev-Modus auch abgefangen als fatalen Fehler melden.
function ladeSprachModul(): SprachModul | null {
  if (!requireOptionalNativeModule('ExpoSpeechRecognition')) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-speech-recognition') as SprachModul;
  } catch {
    return null;
  }
}

const sprachModul = ladeSprachModul();
export const spracheingabeVerfuegbar = sprachModul !== null;

export type SpracheingabeStatus = 'inaktiv' | 'hoert_zu' | 'verarbeitet' | 'fehler';

export interface SpracheingabeState<T> {
  status: SpracheingabeStatus;
  transkript: string;
  /** Ergebnis des Matchers für das finale Transkript — ein Vorschlag, nie eine Entscheidung. */
  treffer: T | null;
  fehlerText: string | null;
  start: () => Promise<void>;
  stop: () => void;
  zuruecksetzen: () => void;
}

function fehlertextFuer(code: string): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Mikrofon- oder Spracherkennungszugriff wurde nicht erlaubt. Bitte erlaube den Zugriff in den Geräteeinstellungen — oder tippe deine Suche ein.';
    case 'language-not-supported':
      return 'Dein Gerät unterstützt die On-Device-Spracherkennung für Deutsch nicht. Bitte tippe deine Suche stattdessen ein.';
    case 'no-speech':
    case 'speech-timeout':
      return 'Wir konnten nichts verstehen. Bitte versuche es erneut oder tippe deine Suche ein.';
    default:
      return 'Die Spracherkennung ist fehlgeschlagen. Bitte versuche es erneut oder tippe deine Suche ein.';
  }
}

// Generalisierte Spracheingabe — der Matcher ist der austauschbare Teil (heute
// @sanime/domain's findeHilfe, später ggf. eine semantische Ebene hinter
// derselben Signatur), der Hook selbst kennt keine Taxonomie.
// Transkript und Audio bleiben ausschließlich im React-State dieses Hooks
// (in-memory, nie AsyncStorage/SecureStore, nie ein Netzwerk-Call) — was das
// Gerät verlässt, entscheidet der Nutzer erst nach Prüfung/Korrektur des
// Transkripts. requiresOnDeviceRecognition erzwingt rein lokale Verarbeitung;
// unterstützt das Gerät das nicht, schlägt start() mit einem Fehler-Event fehl
// statt heimlich auf netzwerkbasierte Erkennung auszuweichen. Die
// Mikrofon-Berechtigung wird erst beim Tap angefragt.
export function useSpracheingabe<T>({ matcher }: { matcher: (transkript: string) => T }): SpracheingabeState<T> {
  const [status, setStatus] = useState<SpracheingabeStatus>('inaktiv');
  const [transkript, setTranskript] = useState('');
  const [treffer, setTreffer] = useState<T | null>(null);
  const [fehlerText, setFehlerText] = useState<string | null>(null);
  // Aktueller Matcher für die einmal registrierten Listener.
  const matcherRef = useRef(matcher);
  useEffect(() => {
    matcherRef.current = matcher;
  });

  useEffect(() => {
    if (!sprachModul) return;
    const modul = sprachModul.ExpoSpeechRecognitionModule;
    const abos = [
      modul.addListener('result', (event) => {
        const text = event.results[0]?.transcript ?? '';
        setTranskript(text);
        if (event.isFinal) {
          setTreffer(matcherRef.current(text));
          setStatus('verarbeitet');
        }
      }),
      modul.addListener('error', (event) => {
        setStatus('fehler');
        setFehlerText(fehlertextFuer(event.error));
      }),
      // Nur zurücksetzen, wenn kein Ergebnis/Fehler den Status bereits
      // weitergeschaltet hat (z.B. der Nutzer bricht per stop() ohne Sprache ab).
      modul.addListener('end', () => setStatus((aktuell) => (aktuell === 'hoert_zu' ? 'inaktiv' : aktuell))),
    ];
    return () => abos.forEach((abo) => abo.remove());
  }, []);

  const start = useCallback(async () => {
    if (!sprachModul) return;
    const { ExpoSpeechRecognitionModule } = sprachModul;
    setFehlerText(null);
    setTranskript('');
    setTreffer(null);
    const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permission.granted) {
      setStatus('fehler');
      setFehlerText('Ohne Mikrofonzugriff können wir dich nicht verstehen. Erlaube den Zugriff in den Geräteeinstellungen — oder tippe deine Suche ein.');
      return;
    }
    setStatus('hoert_zu');
    ExpoSpeechRecognitionModule.start({
      lang: 'de-DE',
      interimResults: true,
      continuous: false,
      requiresOnDeviceRecognition: true,
    });
  }, []);

  const stop = useCallback(() => {
    sprachModul?.ExpoSpeechRecognitionModule.stop();
  }, []);

  const zuruecksetzen = useCallback(() => {
    setStatus('inaktiv');
    setTranskript('');
    setTreffer(null);
    setFehlerText(null);
  }, []);

  return { status, transkript, treffer, fehlerText, start, stop, zuruecksetzen };
}
