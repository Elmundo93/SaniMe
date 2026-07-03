import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE, type Database } from '../../db/client';
import { catalogCategories } from '../../db/schema';
import { TenantScopedRepository } from '../../common/repository/tenant-scoped.repository';
import type { TenantContext } from '../../common/repository/tenant-context';

@Injectable()
export class CategoriesRepository extends TenantScopedRepository {
  constructor(@Inject(DRIZZLE) db: Database) {
    super(db);
  }

  listAll(tenant: TenantContext) {
    return this.db.select().from(catalogCategories).where(this.tenantFilter(catalogCategories.organizationId, tenant));
  }
}
