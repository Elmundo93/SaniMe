import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

// Eine Live-Region für die ganze App: Ergebnisse von Aktionen („Status auf
// ‚Genehmigt‘ gesetzt“) und Ladeergebnisse werden Screenreadern angesagt,
// ohne den Fokus zu verschieben (WCAG 4.1.3).
const AnsageKontext = createContext<(text: string, dringend?: boolean) => void>(() => {});

export function AnsageProvider({ children }: { children: ReactNode }) {
  const [hoeflich, setHoeflich] = useState('');
  const [dringend, setDringend] = useState('');

  const ansagen = useCallback((text: string, istDringend = false) => {
    const setzen = istDringend ? setDringend : setHoeflich;
    // Erst leeren, dann setzen — sonst wird derselbe Text kein zweites Mal gelesen.
    setzen('');
    window.setTimeout(() => setzen(text), 50);
  }, []);

  return (
    <AnsageKontext.Provider value={ansagen}>
      {children}
      <div className="nur-screenreader" role="status" aria-live="polite">
        {hoeflich}
      </div>
      <div className="nur-screenreader" role="alert" aria-live="assertive">
        {dringend}
      </div>
    </AnsageKontext.Provider>
  );
}

export function useAnsage() {
  return useContext(AnsageKontext);
}
