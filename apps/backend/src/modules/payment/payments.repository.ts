import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../../db/client';
import { payments } from '../../db/schema';
import { TenantScopedRepository } from '../../common/repository/tenant-scoped.repository';
import type { TenantContext } from '../../common/repository/tenant-context';

// Statuses a PaymentIntent can still be reused/reconfirmed from — mirrors
// Stripe's own PaymentIntent lifecycle (see PaymentService.createOrReuseIntent).
export const REUSABLE_PAYMENT_STATUSES = ['requires_payment_method', 'requires_confirmation', 'requires_action', 'processing'] as const;

@Injectable()
export class PaymentsRepository extends TenantScopedRepository {
  constructor(@Inject(DRIZZLE) db: Database) {
    super(db);
  }

  async create(tenant: TenantContext, input: { onboardingSessionId: string; stripePaymentIntentId: string; amountCents: number; currency: string }) {
    const [row] = await this.db
      .insert(payments)
      .values({ organizationId: tenant.organizationId, ...input })
      .returning();
    return row;
  }

  async findReusableForSession(tenant: TenantContext, onboardingSessionId: string) {
    const [row] = await this.db
      .select()
      .from(payments)
      .where(
        and(
          this.tenantFilter(payments.organizationId, tenant),
          eq(payments.onboardingSessionId, onboardingSessionId),
          inArray(payments.status, REUSABLE_PAYMENT_STATUSES),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  // Untenanted, keyed by Stripe's own globally-unique id — the webhook
  // handler receives only a PaymentIntent id from Stripe, no tenant context,
  // same "external id first, tenant context derived after" precedent as
  // DataExportRequestsRepository.findByIdUntenanted.
  async findByStripePaymentIntentId(stripePaymentIntentId: string) {
    const [row] = await this.db.select().from(payments).where(eq(payments.stripePaymentIntentId, stripePaymentIntentId)).limit(1);
    return row ?? null;
  }

  async setStatus(id: string, status: string, failureReason: string | null = null) {
    const [row] = await this.db
      .update(payments)
      .set({ status, failureReason, updatedAt: new Date() })
      .where(eq(payments.id, id))
      .returning();
    return row;
  }

  async setSupplyId(id: string, supplyId: string) {
    await this.db.update(payments).set({ supplyId, updatedAt: new Date() }).where(eq(payments.id, id));
  }
}
