import { createWorkflow, type TransitionRule } from './workflow';

// Full 14-status model from work/Backendsprint.md's Supply/Order-Modul
// section. Layer 2 code only *drives* this up through 'submitted' (via
// SupplyOrderService.createFromOnboarding); 'insurance_review' onward is
// Layer 3 (Admin) territory — the table is complete now so Layer 3 only
// adds callers, never touches this file again.
export type SupplyStatus =
  | 'draft'
  | 'documents_uploaded'
  | 'ocr_verified'
  | 'customer_confirmation_required'
  | 'submitted'
  | 'insurance_review'
  | 'approved'
  | 'rejected'
  | 'supplier_assigned'
  | 'ordered'
  | 'appointment_scheduled'
  | 'delivered'
  | 'completed'
  | 'archived';

export type SupplyEvent =
  | { type: 'SupplyCreated' }
  | { type: 'DocumentsUploaded' }
  | { type: 'OcrVerified' }
  | { type: 'CustomerConfirmationReceived' }
  | { type: 'Submitted' }
  | { type: 'InsuranceApproved' }
  | { type: 'InsuranceRejected' }
  | { type: 'SupplierAssigned' }
  | { type: 'Ordered' }
  | { type: 'AppointmentScheduled' }
  | { type: 'Delivered' }
  | { type: 'Completed' }
  | { type: 'Archived' };

export interface SupplyContext {
  id: string;
  status: SupplyStatus;
}

// The emitted event is simply the triggering event decorated with
// supplyId/occurredAt, not a separate taxonomy — event consumers
// (AuditService, TIMELINE_META, OPEN_ACTIONS_META) key off `type` directly.
export type SupplyDomainEvent = SupplyEvent & { supplyId: string; occurredAt: string };

function emitEvent(context: SupplyContext, event: SupplyEvent): SupplyDomainEvent[] {
  return [{ ...event, supplyId: context.id, occurredAt: new Date().toISOString() }];
}

// documents_uploaded/ocr_verified are past-tense checkpoint labels (like
// OnboardingSession's own status names); customer_confirmation_required is
// the doc's own verbatim status name and reads as a checkpoint too — the
// customer's binding confirmation was received at this checkpoint.
// 'insurance_review' has no entry transition yet: submitted goes straight to
// approved/rejected in Layer 2. Layer 3 adds a distinct "review started"
// transition once an admin action needs to represent that in-between state
// explicitly — the status is declared now so that addition never needs a
// union change, only a new table row.
export const SUPPLY_TRANSITIONS: TransitionRule<SupplyStatus, SupplyEvent, SupplyContext, SupplyDomainEvent>[] = [
  { from: 'draft', event: 'SupplyCreated', to: 'draft', emit: emitEvent },
  { from: 'draft', event: 'DocumentsUploaded', to: 'documents_uploaded', emit: emitEvent },
  { from: 'documents_uploaded', event: 'OcrVerified', to: 'ocr_verified', emit: emitEvent },
  { from: 'ocr_verified', event: 'CustomerConfirmationReceived', to: 'customer_confirmation_required', emit: emitEvent },
  { from: 'customer_confirmation_required', event: 'Submitted', to: 'submitted', emit: emitEvent },
  { from: 'submitted', event: 'InsuranceApproved', to: 'approved', emit: emitEvent },
  { from: 'submitted', event: 'InsuranceRejected', to: 'rejected', emit: emitEvent },
  { from: 'insurance_review', event: 'InsuranceApproved', to: 'approved', emit: emitEvent },
  { from: 'insurance_review', event: 'InsuranceRejected', to: 'rejected', emit: emitEvent },
  { from: 'approved', event: 'SupplierAssigned', to: 'supplier_assigned', emit: emitEvent },
  { from: 'supplier_assigned', event: 'Ordered', to: 'ordered', emit: emitEvent },
  { from: 'ordered', event: 'AppointmentScheduled', to: 'appointment_scheduled', emit: emitEvent },
  { from: 'appointment_scheduled', event: 'Delivered', to: 'delivered', emit: emitEvent },
  { from: 'delivered', event: 'Completed', to: 'completed', emit: emitEvent },
  { from: 'completed', event: 'Archived', to: 'archived', emit: emitEvent },
  { from: 'rejected', event: 'Archived', to: 'archived', emit: emitEvent },
];

export const SupplyWorkflow = createWorkflow<SupplyStatus, SupplyEvent, SupplyContext, SupplyDomainEvent>(
  SUPPLY_TRANSITIONS,
  (context) => context,
);

export function erstelleLeereSupply(id: string): SupplyContext {
  return { id, status: 'draft' };
}
