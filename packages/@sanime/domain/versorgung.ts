// Versorgungsprozess nach der Bestellung: Genehmigungsfristen und die
// Notfalllieferung — von App (Anzeige, Formular) und Backend (Validierung)
// gemeinsam genutzt.

// § 13 Abs. 3a SGB V: Die Krankenkasse entscheidet innerhalb von drei Wochen,
// mit Gutachten des Medizinischen Dienstes innerhalb von fünf Wochen.
export const GENEHMIGUNGSFRIST_TAGE = 21;
export const GENEHMIGUNGSFRIST_MIT_GUTACHTEN_TAGE = 35;

// Spätestes Datum, bis zu dem die Kasse ohne Gutachten antworten muss.
export function erwarteteAntwortBis(versendetAm: string | Date): Date {
  const datum = new Date(versendetAm);
  datum.setDate(datum.getDate() + GENEHMIGUNGSFRIST_TAGE);
  return datum;
}

// Gründe als feste Auswahl statt Freitext: genug für die Einordnung des
// Rückrufs, ohne dass der Kunde Diagnosen eintippen muss.
export const NOTFALL_GRUENDE = {
  KRANKENHAUSENTLASSUNG: 'Entlassung aus dem Krankenhaus steht bevor',
  STURZGEFAHR: 'Sturzgefahr oder Unsicherheit im Alltag',
  PFLEGE_ZUHAUSE: 'Pflege zu Hause ist sonst nicht möglich',
  SONSTIGES: 'Anderer dringender Grund',
} as const;
export type NotfallGrund = keyof typeof NOTFALL_GRUENDE;

export const ERREICHBARKEITEN = {
  VORMITTAG: 'Vormittags (8–12 Uhr)',
  NACHMITTAG: 'Nachmittags (12–18 Uhr)',
  GANZTAGS: 'Jederzeit',
} as const;
export type Erreichbarkeit = keyof typeof ERREICHBARKEITEN;

// Eine Notfalllieferung wird nie automatisch zugesagt: unser Team ruft an und
// klärt, ob und wie früher geliefert werden kann (ggf. vor der Genehmigung).
// telefon fehlt nur an der Kasse eines Neukunden — dann gilt die dort
// bestätigte Nummer.
export interface NotfallAnfrage {
  grund: NotfallGrund;
  erreichbarkeit: Erreichbarkeit;
  telefon?: string;
}

export function istNotfallAnfrage(wert: unknown): wert is NotfallAnfrage {
  if (typeof wert !== 'object' || wert === null) return false;
  const w = wert as Record<string, unknown>;
  return (
    typeof w.grund === 'string' &&
    w.grund in NOTFALL_GRUENDE &&
    typeof w.erreichbarkeit === 'string' &&
    w.erreichbarkeit in ERREICHBARKEITEN &&
    (w.telefon === undefined || typeof w.telefon === 'string')
  );
}
