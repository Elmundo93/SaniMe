import { useCallback, useState } from 'react';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { matcheKrankheitsbild, type Krankheitsbild } from '@sanime/domain';

export type SpracheingabeStatus = 'inaktiv' | 'hoert_zu' | 'verarbeitet' | 'fehler';

export interface SpracheingabeState {
  status: SpracheingabeStatus;
  transkript: string;
  erkanntesKrankheitsbild: Krankheitsbild | null;
  fehlerText: string | null;
  start: () => Promise<void>;
  stop: () => void;
  zuruecksetzen: () => void;
}

function fehlertextFuer(code: string): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Mikrofon- oder Spracherkennungszugriff wurde nicht erlaubt. Bitte erlaube den Zugriff in den Geräteeinstellungen.';
    case 'language-not-supported':
      return 'Dein Gerät unterstützt die On-Device-Spracherkennung für Deutsch nicht. Bitte wähle stattdessen aus der Liste unten.';
    case 'no-speech':
    case 'speech-timeout':
      return 'Wir konnten nichts verstehen. Bitte versuche es erneut oder wähle aus der Liste unten.';
    default:
      return 'Die Spracherkennung ist fehlgeschlagen. Bitte versuche es erneut oder wähle aus der Liste unten.';
  }
}

// Transkript und Audio bleiben ausschließlich im React-State dieses Hooks
// (in-memory, nie AsyncStorage/SecureStore, nie ein Netzwerk-Call) — nur die
// vom Nutzer bestätigte Krankheitsbild-id verlässt später das Gerät, exakt
// wie bei der manuellen Auswahl in krankheitsbild.tsx.
// requiresOnDeviceRecognition erzwingt rein lokale Verarbeitung; unterstützt
// das Gerät das nicht, schlägt start() mit einem Fehler-Event fehl statt
// heimlich auf netzwerkbasierte Erkennung auszuweichen.
export function useSprachEingabe(): SpracheingabeState {
  const [status, setStatus] = useState<SpracheingabeStatus>('inaktiv');
  const [transkript, setTranskript] = useState('');
  const [erkanntesKrankheitsbild, setErkanntesKrankheitsbild] = useState<Krankheitsbild | null>(null);
  const [fehlerText, setFehlerText] = useState<string | null>(null);

  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results[0]?.transcript ?? '';
    setTranskript(text);
    if (event.isFinal) {
      setErkanntesKrankheitsbild(matcheKrankheitsbild(text));
      setStatus('verarbeitet');
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    setStatus('fehler');
    setFehlerText(fehlertextFuer(event.error));
  });

  useSpeechRecognitionEvent('end', () => {
    // Nur zurücksetzen, wenn kein Ergebnis/Fehler den Status bereits
    // weitergeschaltet hat (z.B. der Nutzer bricht per stop() ohne Sprache ab).
    setStatus((aktuell) => (aktuell === 'hoert_zu' ? 'inaktiv' : aktuell));
  });

  const start = useCallback(async () => {
    setFehlerText(null);
    setTranskript('');
    setErkanntesKrankheitsbild(null);
    const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permission.granted) {
      setStatus('fehler');
      setFehlerText('Ohne Mikrofonzugriff können wir dich nicht verstehen. Bitte erlaube den Zugriff in den Geräteeinstellungen.');
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
    ExpoSpeechRecognitionModule.stop();
  }, []);

  const zuruecksetzen = useCallback(() => {
    setStatus('inaktiv');
    setTranskript('');
    setErkanntesKrankheitsbild(null);
    setFehlerText(null);
  }, []);

  return { status, transkript, erkanntesKrankheitsbild, fehlerText, start, stop, zuruecksetzen };
}
