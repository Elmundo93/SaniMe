import { useEffect, useRef, useState } from 'react';
import { TextInput } from 'react-native';
import {
  CODE_ERNEUT_SENDEN_SEKUNDEN,
  MOBILNUMMER_FEHLER,
  normalisiereMobilnummer,
  type ClientOnboardingEvent,
  type TransitionResult,
} from '@sanime/domain';
import { smsStattNetzpruefung } from '../lib/api/onboarding';
import { stillePruefen } from '../lib/stillePruefung';
import { useOnboardingStore } from '../store/onboardingStore';

type Dispatch = (event: ClientOnboardingEvent, code?: string) => Promise<TransitionResult & { devCode?: string; checkUrl?: string }>;

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
  // Countdown bis „Code erneut senden“ — dieselbe Wartezeit erzwingt der Server.
  const [erneutIn, setErneutIn] = useState(0);

  useEffect(() => {
    if (erneutIn <= 0) return;
    const t = setTimeout(() => setErneutIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [erneutIn]);

  const codeSenden = async (empfänger: string, email: string | null): Promise<CodeSendenErgebnis> => {
    // Vor dem Senden prüfen — eine Festnetz- oder Auslandsnummer bekäme nie
    // eine SMS, und jeder Versuch zählt gegen die Sendegrenze.
    const telefon = normalisiereMobilnummer(empfänger);
    if (!telefon) {
      setFehler(MOBILNUMMER_FEHLER);
      return 'fehler';
    }
    setFehler('');
    setCode('');
    setLoading(true);
    const result = await dispatch({ type: 'KONTAKT_ERFASST', email, telefon });
    setLoading(false);
    if (!result.ok) {
      setFehler(result.reason);
      return 'fehler';
    }
    setKontakt(empfänger);
    setErneutIn(CODE_ERNEUT_SENDEN_SEKUNDEN);
    // Telekom Verify mit stiller Prüfung: Code direkt über das Mobilfunknetz
    // holen. Klappt das nicht (WLAN, Netz ohne Freigabe), sofort per SMS.
    if (result.checkUrl) {
      setLoading(true);
      const stillerCode = await stillePruefen(result.checkUrl);
      setLoading(false);
      if (stillerCode) {
        setCode(stillerCode);
        if (await verifiziere(stillerCode)) return 'verifiziert';
      }
      const sessionId = useOnboardingStore.getState().session?.id;
      if (sessionId) await smsStattNetzpruefung(sessionId).catch(() => {});
    }
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

  const codeVerifizieren = async (wert = code): Promise<boolean> => {
    if (wert.length < 6) {
      setFehler('Bitte den 6-stelligen Code eingeben.');
      return false;
    }
    return verifiziere(wert);
  };

  // Eingabe (getippt oder per Autofill aus der SMS): bei sechs Ziffern sofort
  // prüfen — kein extra Tipp auf „Bestätigen“ nötig.
  const codeEingeben = async (eingabe: string): Promise<boolean> => {
    const wert = eingabe.replace(/\D/g, '').slice(0, 6);
    setCode(wert);
    if (wert.length < 6 || loading) return false;
    return verifiziere(wert);
  };

  return { kontakt, setKontakt, code, setCode, codeEingeben, loading, fehler, codeRef, codeSenden, codeVerifizieren, erneutIn };
}
