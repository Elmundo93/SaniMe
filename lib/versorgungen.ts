import type { OffeneAktion, OrderStatus, Versorgung } from '../types';

const ABGESCHLOSSENE_STATUS: OrderStatus[] = ['DELIVERED', 'CANCELLED', 'REJECTED'];

export function istAbgeschlossen(versorgung: Versorgung): boolean {
  return ABGESCHLOSSENE_STATUS.includes(versorgung.status);
}

export function aktiveVersorgungen(versorgungen: Versorgung[]): Versorgung[] {
  return versorgungen.filter((v) => !istAbgeschlossen(v));
}

export function abgeschlosseneVersorgungen(versorgungen: Versorgung[]): Versorgung[] {
  return versorgungen.filter(istAbgeschlossen);
}

/** Offene Aktionen aller laufenden Versorgungen — Inhalt des Aufgaben-Tabs und Zähler
 * am Glocken-Symbol im Header. */
export function offeneAufgaben(
  versorgungen: Versorgung[],
): { versorgung: Versorgung; aktion: OffeneAktion }[] {
  return aktiveVersorgungen(versorgungen).flatMap((v) =>
    v.offeneAktionen.map((aktion) => ({ versorgung: v, aktion })),
  );
}
