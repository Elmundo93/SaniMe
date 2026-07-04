import { request } from './client';

// Despite the name, this isn't a login — the backend has no customer
// password/login endpoint. This wraps the Krankenkassenkarte archive-match
// (which claims the current onboarding session to a matched customer,
// keeping the same bearer secret) plus the customer-facing compliance
// routes (/me/*).
export function matchByInsuredNumber(insuredNumber: string): Promise<{ customer: any; addresses: any[]; supplies: any[] }> {
  return request('POST', '/customers/match', { body: { insuredNumber } });
}

export type DataExportStatus = 'pending' | 'processing' | 'ready' | 'failed' | 'expired';

export interface DataExportRequestRow {
  id: string;
  status: DataExportStatus;
  requestedAt: string;
  completedAt: string | null;
  expiresAt: string | null;
  failureReason: string | null;
}

// GET adds a freshly-signed downloadUrl (generated on demand, never persisted —
// same rule as document downloads); POST's response never has one yet.
export interface DataExportRequestDetail extends DataExportRequestRow {
  downloadUrl: string | null;
}

export function requestDataExport(): Promise<DataExportRequestRow> {
  return request('POST', '/me/data-export', { idempotent: true });
}

export function getDataExport(id: string): Promise<DataExportRequestDetail> {
  return request('GET', `/me/data-export/${id}`);
}

export type DeletionReasonCode = 'account_closed' | 'not_using_app' | 'privacy_concern' | 'other';

export interface DeletionRequestRow {
  id: string;
  status: string;
  requestedAt: string;
}

export function requestDeletion(reasonCode: DeletionReasonCode | null): Promise<DeletionRequestRow> {
  return request('POST', '/me/deletion-requests', { body: { reasonCode }, idempotent: true });
}
