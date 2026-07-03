import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../../db/client';
import { suppliers } from '../../db/schema';
import { TenantScopedRepository } from '../../common/repository/tenant-scoped.repository';
import type { TenantContext } from '../../common/repository/tenant-context';

@Injectable()
export class SuppliersRepository extends TenantScopedRepository {
  constructor(@Inject(DRIZZLE) db: Database) {
    super(db);
  }

  listAll(tenant: TenantContext) {
    return this.db.select().from(suppliers).where(this.tenantFilter(suppliers.organizationId, tenant));
  }

  async findById(tenant: TenantContext, id: string) {
    const [row] = await this.db
      .select()
      .from(suppliers)
      .where(and(this.tenantFilter(suppliers.organizationId, tenant), eq(suppliers.id, id)))
      .limit(1);
    return row ?? null;
  }
}
