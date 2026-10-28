import { useEffect, useId, useRef, type ReactNode } from 'react';

// Natives <dialog> mit showModal(): Fokusfalle, Esc zum Schließen und
// inertem Hintergrund liefert der Browser. Nach dem Schließen geht der
// Fokus zurück auf das Element, das den Dialog geöffnet hat (WCAG 2.4.3).
export function Dialog({
  offen,
  titel,
  beschreibung,
  onSchliessen,
  children,
}: {
  offen: boolean;
  titel: string;
  beschreibung?: ReactNode;
  onSchliessen: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const ausloeser = useRef<Element | null>(null);
  const titelId = useId();
  const beschreibungId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (offen && !dialog.open) {
      ausloeser.current = document.activeElement;
      dialog.showModal();
    } else if (!offen && dialog.open) {
      dialog.close();
    }
  }, [offen]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const beimSchliessen = () => {
      onSchliessen();
      if (ausloeser.current instanceof HTMLElement) ausloeser.current.focus();
    };
    dialog.addEventListener('close', beimSchliessen);
    return () => dialog.removeEventListener('close', beimSchliessen);
  }, [onSchliessen]);

  return (
    <dialog ref={ref} aria-labelledby={titelId} aria-describedby={beschreibung ? beschreibungId : undefined}>
      {offen ? (
        <>
          <h2 id={titelId}>{titel}</h2>
          {beschreibung ? <div id={beschreibungId}>{beschreibung}</div> : null}
          {children}
        </>
      ) : null}
    </dialog>
  );
}
