import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE, type Database } from '../db/client';
import { adminUsers } from '../db/schema';
import { TenantScopedRepository } from '../common/repository/tenant-scoped.repository';
import type { TenantContext } from '../common/repository/tenant-context';

// TEMPORARY — delete once Layer 2's HealthData module provides a real
// @AuditRead()-decorated endpoint to point the e2e test at instead.
@Injectable()
export class AuditFixtureRepository extends TenantScopedRepository {
  constructor(@Inject(DRIZZLE) db: Database) {
    super(db);
  }

  listForTenant(tenant: TenantContext) {
    return this.db.select().from(adminUsers).where(this.tenantFilter(adminUsers.organizationId, tenant));
  }
}
