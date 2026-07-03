import { createWorkflow, type TransitionRule } from './workflow';
import type { SupplyStatus } from './supply';

// Unlike data export (a linear, job-driven progression with no branching
// rules — modeling it as a workflow would be ceremony), deletion has the
// same shape that justified SupplyWorkflow: multiple actors (customer
// requests, admin reviews/approves/rejects, system executes) and a real
// guard — erasure can't run while a customer supply is still in flight (an
// order mid-delivery still needs their address/contact to function).
export type DeletionRequestStatus = 'requested' | 'under_review' | 'approved' | 'rejected' | 'cancelled' | 'executing' | 'completed';

export type DeletionRequestEvent =
  | { type: 'ReviewStarted' }
  | { type: 'Approved' }
  | { type: 'Rejected' }
  | { type: 'Cancelled' }
  | { type: 'ExecutionStarted' }
  | { type: 'ExecutionCompleted' };

// customerSupplyStatuses is a snapshot the service populates just before
// calling transition() — the guard needs it, but it isn't persisted on the
// deletion_requests row itself (the source of truth is the supplies table).
export interface DeletionRequestContext {
  id: string;
  status: DeletionRequestStatus;
  customerSupplyStatuses: SupplyStatus[];
}

export type DeletionRequestDomainEvent = DeletionRequestEvent & { deletionRequestId: string; occurredAt: string };

function emitEvent(context: DeletionRequestContext, event: DeletionRequestEvent): DeletionRequestDomainEvent[] {
  return [{ ...event, deletionRequestId: context.id, occurredAt: new Date().toISOString() }];
}

const TERMINAL_SUPPLY_STATUSES: SupplyStatus[] = ['delivered', 'completed', 'archived', 'rejected'];

// Pure and independently unit-testable, same style as
// onboarding.ts's hatPflichtfelderKomplett — the transition table below
// references it from inside a guard, but callers can also call it directly
// (e.g. to explain to an admin why approval is currently blocked).
export function alleVersorgungenTerminal(supplyStatuses: SupplyStatus[]): boolean {
  return supplyStatuses.every((status) => TERMINAL_SUPPLY_STATUSES.includes(status));
}

// under_review is a real intermediate state, not just a formality — but the
// admin-facing "review" action decides approve/reject in one HTTP call, so
// the service replays ReviewStarted then Approved/Rejected as two discrete
// transitions within that one request, exactly like
// SupplyOrderService.createFromOnboarding's ONBOARDING_COMPLETION_REPLAY
// ("events, not one big function, holds even inside one request").
export const DELETION_REQUEST_TRANSITIONS: TransitionRule<
  DeletionRequestStatus,
  DeletionRequestEvent,
  DeletionRequestContext,
  DeletionRequestDomainEvent
>[] = [
  { from: 'requested', event: 'ReviewStarted', to: 'under_review', emit: emitEvent },
  { from: 'requested', event: 'Cancelled', to: 'cancelled', emit: emitEvent },
  {
    from: 'under_review',
    event: 'Approved',
    to: 'approved',
    guard: (context) => alleVersorgungenTerminal(context.customerSupplyStatuses),
    emit: emitEvent,
  },
  { from: 'under_review', event: 'Rejected', to: 'rejected', emit: emitEvent },
  { from: 'under_review', event: 'Cancelled', to: 'cancelled', emit: emitEvent },
  { from: 'approved', event: 'ExecutionStarted', to: 'executing', emit: emitEvent },
  { from: 'executing', event: 'ExecutionCompleted', to: 'completed', emit: emitEvent },
];

export const DeletionRequestWorkflow = createWorkflow<
  DeletionRequestStatus,
  DeletionRequestEvent,
  DeletionRequestContext,
  DeletionRequestDomainEvent
>(DELETION_REQUEST_TRANSITIONS, (context) => context);

export function erstelleAnfrageZurLoeschung(id: string, customerSupplyStatuses: SupplyStatus[]): DeletionRequestContext {
  return { id, status: 'requested', customerSupplyStatuses };
}
