import type { SupplyEvent } from '@sanime/domain';

// Only a subset of events opens an admin task — most transitions are purely
// informational (timeline-only). Matches today's client mock's single
// open-action entry ("Submitted" → Krankenkasse kontaktieren) plus two more
// realistic checkpoints Layer 3's Admin inbox will surface.
export const OPEN_ACTIONS_META: Partial<
  Record<SupplyEvent['type'], { title: string; description: string; actionType: string }>
> = {
  Submitted: {
    title: 'Krankenkasse kontaktieren',
    description: 'Rückfrage/Genehmigung bei der Krankenkasse einholen.',
    actionType: 'formular',
  },
  InsuranceApproved: {
    title: 'Lieferant wählen',
    description: 'Lieferanten für die genehmigte Versorgung auswählen.',
    actionType: 'formular',
  },
  InsuranceRejected: {
    title: 'Ablehnung prüfen',
    description: 'Ablehnung der Krankenkasse prüfen und nächste Schritte klären.',
    actionType: 'formular',
  },
  Ordered: {
    title: 'Termin koordinieren',
    description: 'Liefer-/Anpassungstermin mit dem Kunden koordinieren.',
    actionType: 'formular',
  },
  Delivered: {
    title: 'Übergabe bestätigen',
    description: 'Übergabebestätigung mit dem Kunden abschließen.',
    actionType: 'formular',
  },
};
