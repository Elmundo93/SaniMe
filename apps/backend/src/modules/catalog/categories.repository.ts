import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
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

  // Used by CatalogService.listProductsForKrankheitsbild — a Krankheitsbild
  // (see @sanime/domain's KRANKHEITSBILD_KATALOG) can be tagged onto more
  // than one category, hence a list rather than a single row.
  findByKrankheitsbildId(tenant: TenantContext, krankheitsbildId: string) {
    return this.db
      .select()
      .from(catalogCategories)
      .where(
        and(
          this.tenantFilter(catalogCategories.organizationId, tenant),
          eq(catalogCategories.krankheitsbildId, krankheitsbildId),
        ),
      );
  }
}
