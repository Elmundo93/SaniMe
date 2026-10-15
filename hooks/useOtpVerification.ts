import { useRef, useState } from 'react';
import { TextInput } from 'react-native';
import type { ClientOnboardingEvent, TransitionResult } from '@sanime/domain';

type Dispatch = (event: ClientOnboardingEvent, code?: string) => Promise<TransitionResult & { devCode?: string }>;

// OTP-Sende-/Verifizierungs-Mechanik. codeSenden/codeVerifizieren SIND die
// dispatch()-Aufrufe (KONTAKT_ERFASST löst den Code-Versand serverseitig aus,
// OTP_VERIFIZIERT prüft ihn) — app/scan/checkout.tsx darf danach nicht noch
// einmal selbst dispatchen, sonst feuert ein Tap zwei PATCH-Requests.
export function useOtpVerification(dispatch: Dispatch, initialKontakt = '') {
  const [kontakt, setKontakt] = useState(initialKontakt);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [fehler, setFehler] = useState('');
  const codeRef = useRef<TextInput>(null);

  const codeSenden = async (empfänger: string, email: string | null): Promise<boolean> => {
    if (!empfänger.trim()) {
      setFehler('Bitte Telefonnummer oder E-Mail eingeben.');
      return false;
    }
    setFehler('');
    setLoading(true);
    const result = await dispatch({ type: 'KONTAKT_ERFASST', email, telefon: empfänger.trim() });
    setLoading(false);
    if (!result.ok) {
      setFehler(result.reason);
      return false;
    }
    setKontakt(empfänger);
    if (__DEV__ && result.devCode) setCode(result.devCode);
    setTimeout(() => codeRef.current?.focus(), 300);
    return true;
  };

  const codeVerifizieren = async (): Promise<boolean> => {
    if (code.length < 6) {
      setFehler('Bitte den 6-stelligen Code eingeben.');
      return false;
    }
    setFehler('');
    setLoading(true);
    const result = await dispatch({ type: 'OTP_VERIFIZIERT' }, code);
    setLoading(false);
    if (!result.ok) {
      setFehler(result.reason);
      return false;
    }
    return true;
  };

  return { kontakt, setKontakt, code, setCode, loading, fehler, codeRef, codeSenden, codeVerifizieren };
}
