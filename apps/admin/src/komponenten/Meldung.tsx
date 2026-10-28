import type { ReactNode } from 'react';

const SYMBOL = { fehler: '⚠', warnung: '⚠', erfolg: '✓', info: 'ℹ' } as const;
const VORSPANN = { fehler: 'Fehler:', warnung: 'Achtung:', erfolg: 'Erledigt:', info: 'Hinweis:' } as const;

export function Meldung({ art, children, titel }: { art: keyof typeof SYMBOL; children: ReactNode; titel?: string }) {
  return (
    <div className={`meldung meldung-${art}`} role={art === 'fehler' ? 'alert' : undefined}>
      <p>
        <span aria-hidden="true">{SYMBOL[art]} </span>
        <strong>{titel ?? VORSPANN[art]}</strong> {children}
      </p>
    </div>
  );
}

export function Laedt({ was }: { was: string }) {
  return (
    <p role="status" aria-live="polite">
      {was} wird geladen …
    </p>
  );
}
