import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../../db/client';
import { onboardingSessions, type NewOnboardingSessionRow } from '../../db/schema';
import { TenantScopedRepository } from '../../common/repository/tenant-scoped.repository';
import type { TenantContext } from '../../common/repository/tenant-context';

@Injectable()
export class OnboardingSessionsRepository extends TenantScopedRepository {
  constructor(@Inject(DRIZZLE) db: Database) {
    super(db);
  }

  async create(tenant: TenantContext, sessionSecretHash: string) {
    const [row] = await this.db
      .insert(onboardingSessions)
      .values({ organizationId: tenant.organizationId, sessionSecretHash, status: 'WILLKOMMEN' })
      .returning();
    return row;
  }

  // Called by CustomerSessionSecretAdapter during auth resolution — no
  // tenant context is known yet at that point (this IS how tenant gets
  // established for the request), so it searches by hash alone. Fine for
  // the single-tenant pilot; a real multi-tenant deployment would need the
  // hash to be globally unique across tenants too (it already is, via the
  // DB unique constraint), so this remains correct as-is.
  async findBySecretHash(sessionSecretHash: string) {
    const [row] = await this.db
      .select()
      .from(onboardingSessions)
      .where(eq(onboardingSessions.sessionSecretHash, sessionSecretHash))
      .limit(1);
    return row ?? null;
  }

  async findById(tenant: TenantContext, id: string) {
    const [row] = await this.db
      .select()
      .from(onboardingSessions)
      .where(and(this.tenantFilter(onboardingSessions.organizationId, tenant), eq(onboardingSessions.id, id)))
      .limit(1);
    return row ?? null;
  }

  async update(tenant: TenantContext, id: string, patch: Partial<NewOnboardingSessionRow>) {
    const [row] = await this.db
      .update(onboardingSessions)
      .set({ ...patch, updatedAt: new Date() })
      .where(and(this.tenantFilter(onboardingSessions.organizationId, tenant), eq(onboardingSessions.id, id)))
      .returning();
    return row;
  }

  async claimToCustomer(tenant: TenantContext, id: string, customerId: string) {
    await this.db
      .update(onboardingSessions)
      .set({ customerId, updatedAt: new Date() })
      .where(and(this.tenantFilter(onboardingSessions.organizationId, tenant), eq(onboardingSessions.id, id)));
  }
}
