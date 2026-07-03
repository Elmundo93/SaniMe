import { eq, type SQL } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';
import type { Database } from '../../db/client';
import type { TenantContext } from './tenant-context';

// Base class every future repository extends. The tenant context travels
// through every method signature from day 1 (even though it always resolves
// to DEFAULT_ORGANIZATION_ID for the pilot) so that real multi-tenant
// filtering later is a change to `tenantFilter()`, not an audit of every
// call site — see work/Backendsprint.md Principle 9 / "organizations" seam.
export abstract class TenantScopedRepository {
  protected constructor(protected readonly db: Database) {}

  protected tenantFilter(organizationIdColumn: PgColumn, tenant: TenantContext): SQL {
    return eq(organizationIdColumn, tenant.organizationId);
  }
}
