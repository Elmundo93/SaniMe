import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../../db/client';
import { retentionPolicies } from '../../db/schema';
import { TenantScopedRepository } from '../../common/repository/tenant-scoped.repository';
import type { TenantContext } from '../../common/repository/tenant-context';

@Injectable()
export class RetentionPoliciesRepository extends TenantScopedRepository {
  constructor(@Inject(DRIZZLE) db: Database) {
    super(db);
  }

  listEnabled(tenant: TenantContext) {
    return this.db
      .select()
      .from(retentionPolicies)
      .where(and(this.tenantFilter(retentionPolicies.organizationId, tenant), eq(retentionPolicies.enabled, true)));
  }
}
