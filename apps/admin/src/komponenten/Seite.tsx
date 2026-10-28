import { useEffect, useRef, type ReactNode } from 'react';

// Jede Seite: Titel im Browser-Tab und Fokus auf die Hauptüberschrift nach
// einem Seitenwechsel — Screenreader und Tastatur starten so am Seitenanfang
// statt irgendwo im alten Inhalt (WCAG 2.4.2, 2.4.3).
export function Seite({ titel, unterzeile, aktionen, children }: { titel: string; unterzeile?: ReactNode; aktionen?: ReactNode; children: ReactNode }) {
  const ueberschrift = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    document.title = `${titel} – SaniMe Admin`;
  }, [titel]);

  useEffect(() => {
    ueberschrift.current?.focus();
  }, []);

  return (
    <>
      <div className="seitenkopf">
        <div>
          <h1 ref={ueberschrift} tabIndex={-1}>
            {titel}
          </h1>
          {unterzeile ? <p>{unterzeile}</p> : null}
        </div>
        {aktionen}
      </div>
      {children}
    </>
  );
}
