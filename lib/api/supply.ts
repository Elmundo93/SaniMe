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
  hilfsmittelNrSnapshot: string;
  doctorNameSnapshot: string;
  insurerNameSnapshot: string;
  deliveryTimeLabelSnapshot: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  timeline: TimelineEventRow[];
  openActions: OpenActionRow[];
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
