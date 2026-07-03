import { createParamDecorator, ForbiddenException, type ExecutionContext } from '@nestjs/common';

// For AnyPrincipalAuthGuard routes, where the caller could be either kind of
// principal. Same {type, id} shape as SupplyActor, so it drops straight into
// any actor-typed call (audit records, ownership checks). `id` is null for a
// customer principal that hasn't been identified yet (pre-claim session) —
// callers MUST treat that as "cannot be resolved to an owner," never as
// "unrestricted" (that sentinel is reserved for the absence of a customer
// principal at all, i.e. an admin caller).
export interface CurrentPrincipalInfo {
  type: 'admin' | 'customer';
  id: string | null;
}

export const CurrentPrincipal = createParamDecorator((_data: unknown, ctx: ExecutionContext): CurrentPrincipalInfo | null => {
  const request = ctx.switchToHttp().getRequest();
  if (request.admin) {
    return { type: 'admin', id: request.admin.id };
  }
  if (request.customer) {
    return { type: 'customer', id: request.customer.customerId };
  }
  return null;
});

// Resolves an AnyPrincipalAuthGuard-authenticated caller to an ownership
// filter for customer-scoped resources: null means "unrestricted" (an
// admin), a customerId means "restrict to this customer's own resources".
// An unclaimed customer session (id === null) fails closed with 403 rather
// than falling through to "unrestricted" — the two null-ish cases must never
// collapse into the same outcome, or an unidentified session would see
// everyone's data instead of no one's.
export function resolveOwnerFilter(principal: CurrentPrincipalInfo | null): string | null {
  if (principal?.type === 'admin') {
    return null;
  }
  if (principal?.type === 'customer' && principal.id) {
    return principal.id;
  }
  throw new ForbiddenException('Diese Sitzung ist noch keinem Kunden zugeordnet');
}
