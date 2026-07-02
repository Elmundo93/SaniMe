import type { OrderStatus } from '../types';
import { StatusLabel, StatusSteps } from '../constants/labels';

const FORTSCHRITT: Partial<Record<OrderStatus, number>> = {
  PENDING_REVIEW: 0.18,
  PENDING_INSURANCE: 0.38,
  APPROVED: 0.58,
  PROCESSING: 0.75,
  SHIPPED: 0.9,
  DELIVERED: 1,
};

export function berechneFortschritt(status: OrderStatus): number {
  return FORTSCHRITT[status] ?? 0;
}

export function naechsterSchritt(status: OrderStatus): string | null {
  const index = StatusSteps.indexOf(status);
  if (index === -1 || index === StatusSteps.length - 1) return null;
  return StatusLabel[StatusSteps[index + 1]];
}
