import { useRef, useState } from 'react';
import { TextInput } from 'react-native';

export type OtpPhase = 'eingabe' | 'code';

// Reine OTP-Sende-/Verifizierungs-Mechanik (Mock-Delays, Validierung) — kennt keine
// Stores. Wird von app/auth/otp.tsx (Re-Login) und app/scan/checkout.tsx (Erstauftrag)
// gemeinsam genutzt; was bei Erfolg passiert, entscheidet jeweils der Aufrufer.
export function useOtpVerification(initialKontakt = '') {
  const [phase, setPhase] = useState<OtpPhase>('eingabe');
  const [kontakt, setKontakt] = useState(initialKontakt);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [fehler, setFehler] = useState('');
  const codeRef = useRef<TextInput>(null);

  const codeSenden = async (empfänger: string): Promise<boolean> => {
    if (!empfänger.trim()) {
      setFehler('Bitte Telefonnummer oder E-Mail eingeben.');
      return false;
    }
    setFehler('');
    setLoading(true);
    // In Produktion: SMS/E-Mail-Versand via Backend
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    setKontakt(empfänger);
    setPhase('code');
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
    // In Produktion: Verifizierung via Backend
    await new Promise((r) => setTimeout(r, 1500));
    setLoading(false);
    return true;
  };

  const reset = () => {
    setPhase('eingabe');
    setCode('');
    setFehler('');
  };

  return { phase, kontakt, setKontakt, code, setCode, loading, fehler, codeRef, codeSenden, codeVerifizieren, reset };
}
