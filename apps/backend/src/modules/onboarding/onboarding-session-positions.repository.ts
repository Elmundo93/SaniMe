import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, notInArray } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../../db/client';
import { onboardingSessionPositions, type NewOnboardingSessionPositionRow } from '../../db/schema';
import { TenantScopedRepository } from '../../common/repository/tenant-scoped.repository';
import type { TenantContext } from '../../common/repository/tenant-context';

type PositionPatch = Partial<Pick<NewOnboardingSessionPositionRow, 'supplierProductId' | 'ocrResultId' | 'krankheitsbildId' | 'withoutPrescription' | 'sortOrder'>>;

// Warenkorb-Positionen einer Onboarding-Session — Schlüssel ist (Session, Produkt).
@Injectable()
export class OnboardingSessionPositionsRepository extends TenantScopedRepository {
  constructor(@Inject(DRIZZLE) db: Database) {
    super(db);
  }

  listForSession(tenant: TenantContext, sessionId: string) {
    return this.db
      .select()
      .from(onboardingSessionPositions)
      .where(this.sessionFilter(tenant, sessionId))
      .orderBy(asc(onboardingSessionPositions.sortOrder), asc(onboardingSessionPositions.createdAt));
  }

  async upsert(
    tenant: TenantContext,
    sessionId: string,
    productId: string,
    values: PositionPatch,
  ) {
    await this.db
      .insert(onboardingSessionPositions)
      .values({ ...values, onboardingSessionId: sessionId, organizationId: tenant.organizationId, productId })
      .onConflictDoUpdate({
        target: [onboardingSessionPositions.onboardingSessionId, onboardingSessionPositions.productId],
        set: values,
      });
  }

  async update(tenant: TenantContext, sessionId: string, productId: string, patch: PositionPatch) {
    await this.db
      .update(onboardingSessionPositions)
      .set(patch)
      .where(and(this.sessionFilter(tenant, sessionId), eq(onboardingSessionPositions.productId, productId)));
  }

  // Entfernt alle Positionen, deren Produkt nicht mehr im Warenkorb ist.
  async deleteAllExcept(tenant: TenantContext, sessionId: string, productIds: string[]) {
    await this.db
      .delete(onboardingSessionPositions)
      .where(
        productIds.length > 0
          ? and(this.sessionFilter(tenant, sessionId), notInArray(onboardingSessionPositions.productId, productIds))
          : this.sessionFilter(tenant, sessionId),
      );
  }

  private sessionFilter(tenant: TenantContext, sessionId: string) {
    return and(
      this.tenantFilter(onboardingSessionPositions.organizationId, tenant),
      eq(onboardingSessionPositions.onboardingSessionId, sessionId),
    );
  }
}
