import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../../db/client';
import { supplies, type NewSupply } from '../../db/schema';
import { TenantScopedRepository } from '../../common/repository/tenant-scoped.repository';
import type { TenantContext } from '../../common/repository/tenant-context';

@Injectable()
export class SuppliesRepository extends TenantScopedRepository {
  constructor(@Inject(DRIZZLE) db: Database) {
    super(db);
  }

  async create(tenant: TenantContext, input: Omit<NewSupply, 'organizationId' | 'id' | 'createdAt' | 'updatedAt'>) {
    const [row] = await this.db
      .insert(supplies)
      .values({ organizationId: tenant.organizationId, ...input })
      .returning();
    return row;
  }

  async findById(tenant: TenantContext, id: string) {
    const [row] = await this.db
      .select()
      .from(supplies)
      .where(and(this.tenantFilter(supplies.organizationId, tenant), eq(supplies.id, id)))
      .limit(1);
    return row ?? null;
  }

  listAll(tenant: TenantContext) {
    return this.db.select().from(supplies).where(this.tenantFilter(supplies.organizationId, tenant));
  }

  listForCustomer(tenant: TenantContext, customerId: string) {
    return this.db
      .select()
      .from(supplies)
      .where(and(this.tenantFilter(supplies.organizationId, tenant), eq(supplies.customerId, customerId)));
  }

  async setStatus(tenant: TenantContext, id: string, status: string) {
    await this.db
      .update(supplies)
      .set({ status, updatedAt: new Date() })
      .where(and(this.tenantFilter(supplies.organizationId, tenant), eq(supplies.id, id)));
  }
}
