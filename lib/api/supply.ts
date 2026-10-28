import type { NotfallAnfrage } from '@sanime/domain';
import { request } from './client';

// Mirrors apps/backend/src/db/schema/supply-order.schema.ts's `supplies` row shape
// (camelCase, as returned by drizzle) — kept minimal to just the fields lib/supplyMapper.ts reads.
export interface TimelineEventRow {
  id: string;
  label: string;
  description: string;
  occurredAt: string | null;
  completed: boolean;
}

export interface OpenActionRow {
  id: string;
  title: string;
  description: string;
  actionType: string;
  resolvedAt: string | null;
}

// GET /supplies and GET /supplies/:id share this exact shape — both attach the
// full timeline and open-action history per row (batched for the list endpoint,
// see SupplyOrderService.listSupplies), so one mapper (lib/supplyMapper.ts) covers both.
export interface SupplyRow {
  id: string;
  customerId: string | null;
  productNameSnapshot: string;
  manufacturerNameSnapshot: string;
  hilfsmittelNrSnapshot: string | null;
  doctorNameSnapshot: string;
  insurerNameSnapshot: string;
  deliveryTimeLabelSnapshot: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  insuranceSubmittedAt: string | null;
  insuranceDecidedAt: string | null;
  timeline: TimelineEventRow[];
  openActions: OpenActionRow[];
  appointment: { start: string; end: string } | null;
  urgentRequest: { reason: string; availability: string; createdAt: string } | null;
}

export interface TerminVorschlag {
  supplierId: string;
  productId: string;
  start: string;
  end: string;
}

export function list(): Promise<SupplyRow[]> {
  return request('GET', '/supplies');
}

export function getById(id: string): Promise<SupplyRow> {
  return request('GET', `/supplies/${id}`);
}

export function getOrder(id: string): Promise<unknown> {
  return request('GET', `/orders/${id}`);
}

// Liefertermin nach der Genehmigung — nur aus den Vorschlägen des Servers.
export function terminVorschlaege(supplyId: string): Promise<TerminVorschlag[]> {
  return request('GET', `/supplies/${supplyId}/appointment-slots`);
}

export function terminWaehlen(supplyId: string, start: string): Promise<{ start: string; end: string }> {
  return request('POST', `/supplies/${supplyId}/appointment`, { body: { start } });
}

export function notfallAnfragen(supplyId: string, anfrage: NotfallAnfrage): Promise<{ ok: true }> {
  return request('POST', `/supplies/${supplyId}/notfall`, { body: anfrage });
}
