import { useRef, useState } from 'react';
import { TextInput } from 'react-native';
import type { ClientOnboardingEvent, TransitionResult } from '@sanime/domain';

type Dispatch = (event: ClientOnboardingEvent, code?: string) => Promise<TransitionResult & { devCode?: string }>;

// OTP-Sende-/Verifizierungs-Mechanik. codeSenden/codeVerifizieren SIND die
// dispatch()-Aufrufe (KONTAKT_ERFASST löst den Code-Versand serverseitig aus,
// OTP_VERIFIZIERT prüft ihn) — app/scan/checkout.tsx darf danach nicht noch
// einmal selbst dispatchen, sonst feuert ein Tap zwei PATCH-Requests.
export type CodeSendenErgebnis = 'fehler' | 'gesendet' | 'verifiziert';

export function useOtpVerification(dispatch: Dispatch, initialKontakt = '') {
  const [kontakt, setKontakt] = useState(initialKontakt);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [fehler, setFehler] = useState('');
  const codeRef = useRef<TextInput>(null);

  const codeSenden = async (empfänger: string, email: string | null): Promise<CodeSendenErgebnis> => {
    if (!empfänger.trim()) {
      setFehler('Bitte Telefonnummer oder E-Mail eingeben.');
      return 'fehler';
    }
    setFehler('');
    setLoading(true);
    const result = await dispatch({ type: 'KONTAKT_ERFASST', email, telefon: empfänger.trim() });
    setLoading(false);
    if (!result.ok) {
      setFehler(result.reason);
      return 'fehler';
    }
    setKontakt(empfänger);
    // Dev-Build: Es gibt noch keinen echten SMS-/Mail-Versand (der Backend-
    // DevCodeVerificationProvider liefert den Code nur in der Antwort zurück),
    // also das OTP-Gate direkt mit diesem Code durchlaufen. Geht trotzdem über
    // den echten OTP_VERIFIZIERT-PATCH, damit der Server telefonVerifiziert setzt.
    if (__DEV__ && result.devCode) {
      setCode(result.devCode);
      if (await verifiziere(result.devCode)) return 'verifiziert';
      return 'gesendet';
    }
    setTimeout(() => codeRef.current?.focus(), 300);
    return 'gesendet';
  };

  const verifiziere = async (wert: string): Promise<boolean> => {
    setFehler('');
    setLoading(true);
    const result = await dispatch({ type: 'OTP_VERIFIZIERT' }, wert);
    setLoading(false);
    if (!result.ok) {
      setFehler(result.reason);
      return false;
    }
    return true;
  };

  const codeVerifizieren = async (): Promise<boolean> => {
    if (code.length < 6) {
      setFehler('Bitte den 6-stelligen Code eingeben.');
      return false;
    }
    return verifiziere(code);
  };

  return { kontakt, setKontakt, code, setCode, loading, fehler, codeRef, codeSenden, codeVerifizieren };
}
