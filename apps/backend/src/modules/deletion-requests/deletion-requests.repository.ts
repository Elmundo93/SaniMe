import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../../db/client';
import { deletionRequests, type DeletionReasonCode } from '../../db/schema';
import { TenantScopedRepository } from '../../common/repository/tenant-scoped.repository';
import type { TenantContext } from '../../common/repository/tenant-context';

@Injectable()
export class DeletionRequestsRepository extends TenantScopedRepository {
  constructor(@Inject(DRIZZLE) db: Database) {
    super(db);
  }

  async create(
    tenant: TenantContext,
    input: { customerId: string; requestedByType: 'customer' | 'admin'; requestedById: string; reasonCode: DeletionReasonCode | null },
  ) {
    const [row] = await this.db
      .insert(deletionRequests)
      .values({ organizationId: tenant.organizationId, ...input })
      .returning();
    return row;
  }

  async findById(tenant: TenantContext, id: string) {
    const [row] = await this.db
      .select()
      .from(deletionRequests)
      .where(and(this.tenantFilter(deletionRequests.organizationId, tenant), eq(deletionRequests.id, id)))
      .limit(1);
    return row ?? null;
  }

  // Untenanted, used only by DeletionExecuteJobHandler — same precedent as
  // NotificationsRepository.findById / DataExportRequestsRepository.findByIdUntenanted.
  async findByIdUntenanted(id: string) {
    const [row] = await this.db.select().from(deletionRequests).where(eq(deletionRequests.id, id)).limit(1);
    return row ?? null;
  }

  listAll(tenant: TenantContext) {
    return this.db
      .select()
      .from(deletionRequests)
      .where(this.tenantFilter(deletionRequests.organizationId, tenant))
      .orderBy(asc(deletionRequests.requestedAt));
  }

  async setStatus(id: string, status: string) {
    await this.db.update(deletionRequests).set({ status }).where(eq(deletionRequests.id, id));
  }

  async setReview(id: string, input: { reviewedByAdminId: string; reviewedAt: Date; reviewNote: string | null }) {
    await this.db.update(deletionRequests).set(input).where(eq(deletionRequests.id, id));
  }

  async setExecutedAt(id: string) {
    await this.db.update(deletionRequests).set({ executedAt: new Date() }).where(eq(deletionRequests.id, id));
  }

  async setFailureReason(id: string, reason: string) {
    await this.db.update(deletionRequests).set({ failureReason: reason }).where(eq(deletionRequests.id, id));
  }
}
