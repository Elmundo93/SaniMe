import { erlaubteSupplyEvents, type SupplyEvent, type SupplyStatus } from '@sanime/domain';

// Alle deutschen Texte zu Status und Aktionen an einer Stelle (wie
// constants/labels.ts in der Kunden-App) — nie `insurance_review` in der UI.

export type Ton = 'neutral' | 'info' | 'erfolg' | 'warnung' | 'kritisch';

export const STATUS: Record<SupplyStatus, { label: string; ton: Ton; symbol: string }> = {
  draft: { label: 'Entwurf', ton: 'neutral', symbol: '○' },
  documents_uploaded: { label: 'Dokumente erhalten', ton: 'neutral', symbol: '○' },
  ocr_verified: { label: 'Daten geprüft', ton: 'neutral', symbol: '○' },
  customer_confirmation_required: { label: 'Vom Kunden bestätigt', ton: 'neutral', symbol: '○' },
  submitted: { label: 'Neu eingegangen', ton: 'info', symbol: '●' },
  insurance_review: { label: 'Bei der Krankenkasse', ton: 'warnung', symbol: '◔' },
  approved: { label: 'Genehmigt', ton: 'erfolg', symbol: '✓' },
  rejected: { label: 'Abgelehnt', ton: 'kritisch', symbol: '✕' },
  supplier_assigned: { label: 'Lieferant festgelegt', ton: 'info', symbol: '◑' },
  ordered: { label: 'Beim Lieferanten bestellt', ton: 'info', symbol: '◑' },
  appointment_scheduled: { label: 'Termin vereinbart', ton: 'info', symbol: '◕' },
  delivered: { label: 'Übergeben', ton: 'erfolg', symbol: '✓' },
  completed: { label: 'Abgeschlossen', ton: 'neutral', symbol: '✓' },
  archived: { label: 'Archiviert', ton: 'neutral', symbol: '▪' },
};

// Filter der Versorgungsliste: Gruppen statt 14 Einzelstatus.
export const STATUS_GRUPPEN = {
  neu: { label: 'Neu eingegangen', status: ['submitted'] },
  kasse: { label: 'Bei der Krankenkasse', status: ['insurance_review'] },
  lieferung: { label: 'Genehmigt / in Lieferung', status: ['approved', 'supplier_assigned', 'ordered', 'appointment_scheduled', 'delivered'] },
  abgelehnt: { label: 'Abgelehnt', status: ['rejected'] },
  fertig: { label: 'Abgeschlossen', status: ['completed', 'archived'] },
} as const satisfies Record<string, { label: string; status: readonly SupplyStatus[] }>;
export type StatusGruppe = keyof typeof STATUS_GRUPPEN;

export interface AktionsText {
  // Beschriftung des Knopfs — was man tut (Imperativ/Infinitiv).
  label: string;
  // Wann klicken? Steht unter dem Knopf.
  erklaerung: string;
  // Was der Kunde davon merkt — wird vor dem Klick gezeigt (Prinzip „Folgen sichtbar machen“).
  kunde: string;
  gefahr?: boolean;
  // Bestätigungsdialog mit Pflicht-Begründung (interne Notiz).
  begruendungPflicht?: boolean;
}

export const AKTIONEN: Partial<Record<SupplyEvent['type'], AktionsText>> = {
  AntragVersendet: {
    label: 'Antrag als versendet markieren',
    erklaerung: 'Erst klicken, wenn Kostenvoranschlag und Rezept bei der Krankenkasse sind. Ab dann läuft die Antwortfrist von drei Wochen.',
    kunde: 'Push-Nachricht „Antrag versendet“ und ein Eintrag im Verlauf.',
  },
  OhneGenehmigungFreigegeben: {
    label: 'Ohne Genehmigung freigeben',
    erklaerung: 'Nur für Hilfsmittel, die keine Genehmigung der Krankenkasse brauchen.',
    kunde: 'Eintrag „Freigegeben“ im Verlauf.',
  },
  InsuranceApproved: {
    label: 'Genehmigung eintragen',
    erklaerung: 'Erst eintragen, wenn die Zusage der Krankenkasse vorliegt.',
    kunde: 'Push-Nachricht „Versorgung genehmigt“ und die Aufgabe „Liefertermin wählen“.',
  },
  InsuranceRejected: {
    label: 'Ablehnung eintragen',
    erklaerung: 'Erst eintragen, wenn die Ablehnung der Krankenkasse vorliegt. Danach entsteht die Aufgabe, den Kunden anzurufen.',
    kunde: 'Push-Nachricht „Neuigkeiten zu deiner Versorgung“ (ohne Inhalt) und ein Eintrag im Verlauf.',
    gefahr: true,
    begruendungPflicht: true,
  },
  SupplierAssigned: {
    label: 'Lieferant als festgelegt markieren',
    erklaerung: 'Der Lieferant für diese Versorgung steht fest.',
    kunde: 'Eintrag „Lieferant zugewiesen“ im Verlauf.',
  },
  Ordered: {
    label: 'Als bestellt markieren',
    erklaerung: 'Die Bestellung ist beim Lieferanten raus.',
    kunde: 'Eintrag „Bestellt“ im Verlauf.',
  },
  AppointmentScheduled: {
    label: 'Termin als vereinbart markieren',
    erklaerung: 'Liefer- oder Anpassungstermin ist mit dem Kunden abgestimmt.',
    kunde: 'Eintrag „Termin vereinbart“ im Verlauf.',
  },
  Delivered: {
    label: 'Als übergeben markieren',
    erklaerung: 'Das Hilfsmittel ist beim Kunden angekommen.',
    kunde: 'Eintrag „Geliefert“ im Verlauf.',
  },
  Completed: {
    label: 'Versorgung abschließen',
    erklaerung: 'Übergabe bestätigt, nichts mehr offen.',
    kunde: 'Eintrag „Abgeschlossen“ im Verlauf.',
  },
  Archived: {
    label: 'Archivieren',
    erklaerung: 'Vorgang ablegen. Er bleibt über die Suche auffindbar.',
    kunde: 'Eintrag „Archiviert“ im Verlauf.',
  },
};

// Der übliche nächste Schritt je Status — die eine hervorgehobene Aktion.
const HAUPTWEG: Partial<Record<SupplyStatus, SupplyEvent['type']>> = {
  submitted: 'AntragVersendet',
  insurance_review: 'InsuranceApproved',
  approved: 'SupplierAssigned',
  supplier_assigned: 'Ordered',
  ordered: 'AppointmentScheduled',
  appointment_scheduled: 'Delivered',
  delivered: 'Completed',
  completed: 'Archived',
  rejected: 'Archived',
};

export interface Schritte {
  haupt: SupplyEvent['type'] | null;
  weitere: SupplyEvent['type'][];
}

// Nur Ereignisse, die die gemeinsame Übergangstabelle (@sanime/domain)
// vom aktuellen Status aus erlaubt — die App kann nichts anbieten, was der
// Server ablehnen würde. Ereignisse ohne Text (Onboarding-Replay) entfallen.
export function schritteFuer(status: SupplyStatus): Schritte {
  const erlaubt = erlaubteSupplyEvents(status).filter((ereignis) => AKTIONEN[ereignis]);
  const vorgesehen = HAUPTWEG[status];
  const haupt = vorgesehen && erlaubt.includes(vorgesehen) ? vorgesehen : (erlaubt.find((e) => !AKTIONEN[e]?.gefahr) ?? null);
  return { haupt, weitere: erlaubt.filter((e) => e !== haupt) };
}

export const DRINGLICHKEIT = {
  notfall: { label: 'Notfall', ton: 'kritisch', symbol: '!' },
  frist: { label: 'Frist', ton: 'warnung', symbol: '⏱' },
  neu: { label: 'Neu', ton: 'info', symbol: '●' },
  normal: { label: 'Offen', ton: 'neutral', symbol: '○' },
} as const satisfies Record<string, { label: string; ton: Ton; symbol: string }>;

const datumFormat = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Berlin' });
const zeitFormat = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Berlin',
});

export function datum(wert: string | Date) {
  return datumFormat.format(new Date(wert));
}

export function datumZeit(wert: string | Date) {
  return `${zeitFormat.format(new Date(wert))} Uhr`;
}

// „vor 3 Tagen“ — Wartezeit im Arbeitskorb.
export function seit(wert: string | Date, jetzt = Date.now()) {
  const minuten = Math.max(0, Math.round((jetzt - new Date(wert).getTime()) / 60_000));
  if (minuten < 1) return 'gerade eben';
  if (minuten < 60) return `seit ${minuten} Min.`;
  const stunden = Math.round(minuten / 60);
  if (stunden < 24) return `seit ${stunden} Std.`;
  const tage = Math.round(stunden / 24);
  return tage === 1 ? 'seit 1 Tag' : `seit ${tage} Tagen`;
}

// Frist als Text, nie nur als Farbe: „noch 5 Tage“ / „heute“ / „seit 2 Tagen überfällig“.
export function fristText(bis: string | Date, jetzt = Date.now()) {
  const tage = Math.ceil((new Date(bis).getTime() - jetzt) / 86_400_000);
  if (tage > 1) return `noch ${tage} Tage (bis ${datum(bis)})`;
  if (tage === 1) return `morgen (${datum(bis)})`;
  if (tage === 0) return `heute (${datum(bis)})`;
  return `seit ${-tage} ${tage === -1 ? 'Tag' : 'Tagen'} überfällig (${datum(bis)})`;
}

export function euro(cents: number) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

export function personName(person: { name?: string | null; email?: string | null } | null | undefined) {
  if (!person) return '';
  return person.name?.trim() || person.email || '';
}
