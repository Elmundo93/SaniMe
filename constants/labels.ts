import type { OrderStatus } from '../types';

export const StatusLabel: Record<OrderStatus, string> = {
  PENDING_PRESCRIPTION: 'Rezept ausstehend',
  PENDING_REVIEW: 'Eingegangen',
  PENDING_INSURANCE: 'Bei der Krankenkasse',
  APPROVED: 'Genehmigt',
  PROCESSING: 'Wird vorbereitet',
  SHIPPED: 'Unterwegs',
  DELIVERED: 'Geliefert',
  CANCELLED: 'Storniert',
  REJECTED: 'Abgelehnt',
};

export const StatusDescription: Record<OrderStatus, string> = {
  PENDING_PRESCRIPTION: 'Bitte fotografiere dein Rezept.',
  PENDING_REVIEW: 'Wir prüfen deine Unterlagen und bereiten den Antrag vor.',
  PENDING_INSURANCE: 'Dein Antrag liegt bei der Krankenkasse.',
  APPROVED: 'Deine Versorgung ist freigegeben.',
  PROCESSING: 'Dein Hilfsmittel wird für dich vorbereitet.',
  SHIPPED: 'Dein Liefertermin steht.',
  DELIVERED: 'Deine Versorgung wurde geliefert.',
  CANCELLED: 'Dieser Auftrag wurde storniert.',
  REJECTED: 'Deine Krankenkasse hat abgelehnt — wir melden uns bei dir.',
};

// Reihenfolge der Status-Schritte für die Timeline
export const StatusSteps: OrderStatus[] = [
  'PENDING_REVIEW',
  'PENDING_INSURANCE',
  'APPROVED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
];
