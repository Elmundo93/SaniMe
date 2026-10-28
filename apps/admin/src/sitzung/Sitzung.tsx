import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, type AdminProfil } from '../api/admin';
import { ApiFehler, beiAbmeldung, zeitDerLetztenAntwort } from '../api/client';
import { Dialog } from '../komponenten/Dialog';

// Wer ist angemeldet, was darf die Person? Gleitende Sitzung: der Server
// verlängert bei jeder Anfrage um 30 Minuten. Zwei Minuten vor Ablauf
// warnen wir mit „Angemeldet bleiben“ (WCAG 2.2.1), danach ist die Sitzung
// weg — und mit ihr alle geladenen Daten im Speicher (queryClient.clear()).
export const INAKTIVITAET_MS = 30 * 60 * 1000;
const WARNUNG_VORHER_MS = 2 * 60 * 1000;

type Grund = 'inaktiv' | 'abgelaufen' | 'abgemeldet';

const GRUND_TEXT: Record<Grund, string> = {
  inaktiv: 'Du wurdest nach 30 Minuten ohne Aktivität abgemeldet. Bitte melde dich erneut an.',
  abgelaufen: 'Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.',
  abgemeldet: 'Du hast dich abgemeldet.',
};

interface SitzungsWert {
  profil: AdminProfil | null;
  laedt: boolean;
  darf: (permission: string) => boolean;
  angemeldet: (profil: AdminProfil) => void;
  abmelden: () => Promise<void>;
  hinweis: string | null;
}

const SitzungsKontext = createContext<SitzungsWert | null>(null);

export function SitzungProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [grund, setGrund] = useState<Grund | null>(null);
  const ich = useQuery({
    queryKey: ['ich'],
    queryFn: api.ich,
    retry: false,
    staleTime: Infinity,
  });

  const beenden = useCallback(
    (neuerGrund: Grund) => {
      queryClient.clear();
      queryClient.setQueryData(['ich'], null);
      setGrund(neuerGrund);
    },
    [queryClient],
  );

  // Jede Anfrage, die mit 401 zurückkommt, beendet die Sitzung in der App.
  useEffect(() => beiAbmeldung(() => beenden('abgelaufen')), [beenden]);

  const profil = ich.data ?? null;
  const wert: SitzungsWert = {
    profil,
    laedt: ich.isLoading,
    darf: (permission) => Boolean(profil?.permissions.includes(permission)),
    angemeldet: (neuesProfil) => {
      setGrund(null);
      queryClient.setQueryData(['ich'], neuesProfil);
    },
    abmelden: async () => {
      try {
        await api.abmelden();
      } finally {
        beenden('abgemeldet');
      }
    },
    hinweis: grund ? GRUND_TEXT[grund] : ich.error instanceof ApiFehler && ich.error.status !== 401 ? ich.error.message : null,
  };

  return (
    <SitzungsKontext.Provider value={wert}>
      {children}
      {profil ? <Inaktivitaet onAbgelaufen={() => beenden('inaktiv')} /> : null}
    </SitzungsKontext.Provider>
  );
}

export function useSitzung() {
  const wert = useContext(SitzungsKontext);
  if (!wert) throw new Error('useSitzung außerhalb von SitzungProvider');
  return wert;
}

function Inaktivitaet({ onAbgelaufen }: { onAbgelaufen: () => void }) {
  const queryClient = useQueryClient();
  const [restSekunden, setRestSekunden] = useState<number | null>(null);

  useEffect(() => {
    const pruefen = () => {
      const rest = zeitDerLetztenAntwort() + INAKTIVITAET_MS - Date.now();
      if (rest <= 0) {
        setRestSekunden(null);
        onAbgelaufen();
      } else if (rest <= WARNUNG_VORHER_MS) {
        setRestSekunden(Math.ceil(rest / 1000));
      } else {
        setRestSekunden(null);
      }
    };
    const intervall = window.setInterval(pruefen, 1000);
    return () => window.clearInterval(intervall);
  }, [onAbgelaufen]);

  const bleiben = async () => {
    // /me verlängert die Sitzung auf dem Server.
    await queryClient.fetchQuery({ queryKey: ['ich'], queryFn: api.ich, staleTime: 0 });
    setRestSekunden(null);
  };

  const minuten = restSekunden !== null ? Math.floor(restSekunden / 60) : 0;
  const sekunden = restSekunden !== null ? restSekunden % 60 : 0;

  return (
    <Dialog
      offen={restSekunden !== null}
      titel="Bist du noch da?"
      beschreibung={
        <p>
          Zum Schutz der Gesundheitsdaten wirst du nach 30 Minuten ohne Aktivität abgemeldet. Noch{' '}
          <strong>
            {minuten}:{String(sekunden).padStart(2, '0')} Minuten
          </strong>
          . Ungespeicherte Eingaben gehen dann verloren.
        </p>
      }
      onSchliessen={() => undefined}
    >
      <div className="knopfreihe">
        <button type="button" className="knopf knopf-primaer" onClick={bleiben} autoFocus>
          Angemeldet bleiben
        </button>
      </div>
    </Dialog>
  );
}
