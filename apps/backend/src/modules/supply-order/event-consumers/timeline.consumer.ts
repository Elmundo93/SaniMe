import type { SupplyEvent } from '@sanime/domain';

export const TIMELINE_META: Record<SupplyEvent['type'], { label: string; description: string }> = {
  SupplyCreated: { label: 'Auftrag erstellt', description: 'Deine Versorgung wurde angelegt.' },
  DocumentsUploaded: { label: 'Dokumente hochgeladen', description: 'Deine Dokumente wurden erfolgreich hochgeladen.' },
  OcrVerified: {
    label: 'Rezept eingegangen',
    description: 'Dein Rezept ist bei uns eingegangen.',
  },
  CustomerConfirmationReceived: { label: 'Bestätigung erhalten', description: 'Deine Bestätigung wurde erfasst.' },
  Submitted: {
    label: 'Bestellung eingegangen',
    description: 'Wir prüfen deine Unterlagen und bereiten alles Weitere vor.',
  },
  AntragVersendet: {
    label: 'Antrag an die Krankenkasse gesendet',
    description: 'Die Krankenkasse entscheidet in der Regel innerhalb von drei Wochen.',
  },
  OhneGenehmigungFreigegeben: {
    label: 'Freigegeben',
    description: 'Keine Genehmigung nötig — wir bereiten deine Lieferung vor.',
  },
  InsuranceApproved: { label: 'Genehmigung', description: 'Die Krankenkasse hat die Versorgung genehmigt.' },
  InsuranceRejected: { label: 'Abgelehnt', description: 'Die Krankenkasse hat abgelehnt. Wir melden uns bei dir.' },
  SupplierAssigned: { label: 'Lieferant zugewiesen', description: 'Ein Lieferant wurde für deine Versorgung ausgewählt.' },
  Ordered: { label: 'Bestellt', description: 'Die Versorgung wurde beim Lieferanten bestellt.' },
  AppointmentScheduled: { label: 'Termin vereinbart', description: 'Ein Liefer-/Anpassungstermin wurde vereinbart.' },
  Delivered: { label: 'Geliefert', description: 'Die Versorgung wurde geliefert.' },
  Completed: { label: 'Abgeschlossen', description: 'Die Versorgung ist abgeschlossen.' },
  Archived: { label: 'Archiviert', description: 'Der Vorgang wurde archiviert.' },
};
