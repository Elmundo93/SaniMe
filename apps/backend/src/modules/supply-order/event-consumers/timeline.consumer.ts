import type { SupplyEvent } from '@sanime/domain';

export const TIMELINE_META: Record<SupplyEvent['type'], { label: string; description: string }> = {
  SupplyCreated: { label: 'Auftrag erstellt', description: 'Deine Versorgung wurde angelegt.' },
  DocumentsUploaded: { label: 'Dokumente hochgeladen', description: 'Deine Dokumente wurden erfolgreich hochgeladen.' },
  OcrVerified: {
    label: 'Rezept eingegangen',
    description: 'Ihr Rezept wurde erfolgreich hochgeladen und wird geprüft.',
  },
  CustomerConfirmationReceived: { label: 'Bestätigung erhalten', description: 'Deine Bestätigung wurde erfasst.' },
  Submitted: {
    label: 'Krankenkasse kontaktieren',
    description: 'Wir kontaktieren Ihre Krankenkasse zur Genehmigung.',
  },
  InsuranceApproved: { label: 'Genehmigung', description: 'Die Krankenkasse hat die Versorgung genehmigt.' },
  InsuranceRejected: { label: 'Abgelehnt', description: 'Die Krankenkasse hat die Versorgung abgelehnt.' },
  SupplierAssigned: { label: 'Lieferant zugewiesen', description: 'Ein Lieferant wurde für deine Versorgung ausgewählt.' },
  Ordered: { label: 'Bestellt', description: 'Die Versorgung wurde beim Lieferanten bestellt.' },
  AppointmentScheduled: { label: 'Termin vereinbart', description: 'Ein Liefer-/Anpassungstermin wurde vereinbart.' },
  Delivered: { label: 'Geliefert', description: 'Die Versorgung wurde geliefert.' },
  Completed: { label: 'Abgeschlossen', description: 'Die Versorgung ist abgeschlossen.' },
  Archived: { label: 'Archiviert', description: 'Der Vorgang wurde archiviert.' },
};
