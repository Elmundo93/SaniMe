import type { OrderStatus } from '../types';

export const StatusLabel: Record<OrderStatus, string> = {
  PENDING_PRESCRIPTION: 'Rezept ausstehend',
  PENDING_REVIEW: 'In Prüfung',
  PENDING_INSURANCE: 'Bei der Krankenkasse',
  APPROVED: 'Genehmigt',
  PROCESSING: 'Wird vorbereitet',
  SHIPPED: 'Unterwegs',
  DELIVERED: 'Geliefert',
  CANCELLED: 'Storniert',
  REJECTED: 'Abgelehnt',
};

export const StatusDescription: Record<OrderStatus, string> = {
  PENDING_PRESCRIPTION: 'Bitte laden Sie Ihr Rezept hoch.',
  PENDING_REVIEW: 'Wir prüfen Ihr Rezept und Ihre Unterlagen.',
  PENDING_INSURANCE: 'Wir haben Ihren Antrag an die Krankenkasse gesendet.',
  APPROVED: 'Ihre Versorgung wurde genehmigt.',
  PROCESSING: 'Ihr Hilfsmittel wird für Sie vorbereitet.',
  SHIPPED: 'Ihr Paket ist auf dem Weg zu Ihnen.',
  DELIVERED: 'Ihre Versorgung wurde zugestellt.',
  CANCELLED: 'Dieser Auftrag wurde storniert.',
  REJECTED: 'Leider wurde Ihr Antrag abgelehnt.',
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
