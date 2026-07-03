import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../../db/client';
import { orders, supplies, type NewOrder } from '../../db/schema';
import { TenantScopedRepository } from '../../common/repository/tenant-scoped.repository';
import type { TenantContext } from '../../common/repository/tenant-context';

@Injectable()
export class OrdersRepository extends TenantScopedRepository {
  constructor(@Inject(DRIZZLE) db: Database) {
    super(db);
  }

  async create(tenant: TenantContext, input: Omit<NewOrder, 'organizationId' | 'id' | 'createdAt' | 'updatedAt'>) {
    const [row] = await this.db
      .insert(orders)
      .values({ organizationId: tenant.organizationId, ...input })
      .returning();
    return row;
  }

  async findById(tenant: TenantContext, id: string) {
    const [row] = await this.db
      .select()
      .from(orders)
      .where(and(this.tenantFilter(orders.organizationId, tenant), eq(orders.id, id)))
      .limit(1);
    return row ?? null;
  }

  async findBySupplyId(tenant: TenantContext, supplyId: string) {
    const [row] = await this.db
      .select()
      .from(orders)
      .where(and(this.tenantFilter(orders.organizationId, tenant), eq(orders.supplyId, supplyId)))
      .limit(1);
    return row ?? null;
  }

  async setStatus(tenant: TenantContext, id: string, status: string) {
    await this.db
      .update(orders)
      .set({ status, updatedAt: new Date() })
      .where(and(this.tenantFilter(orders.organizationId, tenant), eq(orders.id, id)));
  }

  // One joined query for the admin order list — avoids an N+1 over
  // per-order supply lookups.
  listAllWithSupply(tenant: TenantContext) {
    return this.db
      .select({
        id: orders.id,
        status: orders.status,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        supplyId: supplies.id,
        customerId: supplies.customerId,
        productNameSnapshot: supplies.productNameSnapshot,
        manufacturerNameSnapshot: supplies.manufacturerNameSnapshot,
      })
      .from(orders)
      .innerJoin(supplies, eq(orders.supplyId, supplies.id))
      .where(this.tenantFilter(orders.organizationId, tenant))
      .orderBy(desc(orders.createdAt));
  }
}
