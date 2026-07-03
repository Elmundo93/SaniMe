import { Inject, Injectable } from '@nestjs/common';
import { and, eq, lt } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../../db/client';
import { dataExportRequests } from '../../db/schema';
import { TenantScopedRepository } from '../../common/repository/tenant-scoped.repository';
import type { TenantContext } from '../../common/repository/tenant-context';

@Injectable()
export class DataExportRequestsRepository extends TenantScopedRepository {
  constructor(@Inject(DRIZZLE) db: Database) {
    super(db);
  }

  async create(tenant: TenantContext, input: { customerId: string; requestedByType: 'customer' | 'admin'; requestedById: string }) {
    const [row] = await this.db
      .insert(dataExportRequests)
      .values({ organizationId: tenant.organizationId, ...input })
      .returning();
    return row;
  }

  async findById(tenant: TenantContext, id: string) {
    const [row] = await this.db
      .select()
      .from(dataExportRequests)
      .where(and(this.tenantFilter(dataExportRequests.organizationId, tenant), eq(dataExportRequests.id, id)))
      .limit(1);
    return row ?? null;
  }

  // Untenanted, used only by DataExportGenerateJobHandler which has an id
  // and nothing else — same precedent as NotificationsRepository.findById.
  async findByIdUntenanted(id: string) {
    const [row] = await this.db.select().from(dataExportRequests).where(eq(dataExportRequests.id, id)).limit(1);
    return row ?? null;
  }

  async setProcessing(id: string) {
    await this.db.update(dataExportRequests).set({ status: 'processing' }).where(eq(dataExportRequests.id, id));
  }

  async setReady(id: string, storageKey: string, expiresAt: Date) {
    await this.db
      .update(dataExportRequests)
      .set({ status: 'ready', storageKey, completedAt: new Date(), expiresAt })
      .where(eq(dataExportRequests.id, id));
  }

  async setFailed(id: string, reason: string) {
    await this.db.update(dataExportRequests).set({ status: 'failed', failureReason: reason }).where(eq(dataExportRequests.id, id));
  }

  async setExpired(id: string) {
    await this.db.update(dataExportRequests).set({ status: 'expired' }).where(eq(dataExportRequests.id, id));
  }

  // Untenanted, used only by the retention job — same precedent as
  // findByIdUntenanted.
  listReadyExpiredBefore(now: Date) {
    return this.db.select().from(dataExportRequests).where(and(eq(dataExportRequests.status, 'ready'), lt(dataExportRequests.expiresAt, now)));
  }
}
