import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import {
  DeletionRequestWorkflow,
  type DeletionRequestContext,
  type DeletionRequestEvent,
  type DeletionRequestStatus,
  type SupplyStatus,
} from '@sanime/domain';
import { DRIZZLE, type Database } from '../../db/client';
import { supplies } from '../../db/schema';
import type { TenantContext } from '../../common/repository/tenant-context';
import { AuditService } from '../audit/audit.service';
import { JOB_QUEUE, type JobQueue } from '../job-queue/ports/job-queue.port';
import { DeletionRequestsRepository } from './deletion-requests.repository';
import type { DeletionReasonCode } from '../../db/schema';

export interface DeletionActor {
  type: 'customer' | 'admin';
  id: string;
}

@Injectable()
export class DeletionRequestsService {
  constructor(
    private readonly requests: DeletionRequestsRepository,
    private readonly auditService: AuditService,
    @Inject(JOB_QUEUE) private readonly jobQueue: JobQueue,
    @Inject(DRIZZLE) private readonly db: Database,
  ) {}

  async requestDeletion(tenant: TenantContext, customerId: string, actor: DeletionActor, reasonCode: DeletionReasonCode | null) {
    const row = await this.requests.create(tenant, { customerId, requestedByType: actor.type, requestedById: actor.id, reasonCode });
    await this.auditService.record({
      tenant,
      actorType: actor.type,
      actorId: actor.id,
      eventType: 'DeletionRequested',
      resourceType: 'deletion_request',
      resourceId: row.id,
    });
    return row;
  }

  listAll(tenant: TenantContext) {
    return this.requests.listAll(tenant);
  }

  async getById(tenant: TenantContext, id: string, actorCustomerId: string | null = null) {
    const row = await this.requireRow(tenant, id);
    if (actorCustomerId !== null && row.customerId !== actorCustomerId) {
      throw new ForbiddenException('Kein Zugriff auf diese Löschanfrage');
    }
    return row;
  }

  // under_review is a real intermediate state, but the admin-facing "review"
  // action decides approve/reject in one call — ReviewStarted is replayed
  // first only if not already past it, so a retry after a guard rejection
  // (supply still in flight) resumes from under_review instead of failing.
  async reviewDeletion(tenant: TenantContext, id: string, decision: 'approved' | 'rejected', note: string | null, adminId: string) {
    const row = await this.requireRow(tenant, id);
    let context = await this.toContext(row);

    if (context.status === 'requested') {
      context = await this.applyEvent(tenant, context, { type: 'ReviewStarted' }, { type: 'admin', id: adminId });
    }

    const event: DeletionRequestEvent = decision === 'approved' ? { type: 'Approved' } : { type: 'Rejected' };
    context = await this.applyEvent(tenant, context, event, { type: 'admin', id: adminId });

    await this.requests.setReview(id, { reviewedByAdminId: adminId, reviewedAt: new Date(), reviewNote: note });
    return context;
  }

  // Applies ExecutionStarted synchronously (status flips to 'executing'
  // immediately, visible to the admin) then hands the actual multi-table
  // erasure to the job queue — it must not block the request.
  async startExecution(tenant: TenantContext, id: string, adminId: string) {
    const row = await this.requireRow(tenant, id);
    const context = await this.toContext(row);
    await this.applyEvent(tenant, context, { type: 'ExecutionStarted' }, { type: 'admin', id: adminId });
    await this.jobQueue.enqueue('deletion-request.execute', { requestId: id });
    return this.requireRow(tenant, id);
  }

  private async requireRow(tenant: TenantContext, id: string) {
    const row = await this.requests.findById(tenant, id);
    if (!row) {
      throw new NotFoundException('Löschanfrage nicht gefunden');
    }
    return row;
  }

  private async toContext(row: { id: string; status: string; customerId: string }): Promise<DeletionRequestContext> {
    const rows = await this.db.select({ status: supplies.status }).from(supplies).where(eq(supplies.customerId, row.customerId));
    return {
      id: row.id,
      status: row.status as DeletionRequestStatus,
      customerSupplyStatuses: rows.map((r) => r.status as SupplyStatus),
    };
  }

  private async applyEvent(
    tenant: TenantContext,
    context: DeletionRequestContext,
    event: DeletionRequestEvent,
    actor: DeletionActor,
  ): Promise<DeletionRequestContext> {
    const result = DeletionRequestWorkflow.transition(context, event);
    if (!result.ok) {
      throw new BadRequestException(result.reason);
    }
    await this.requests.setStatus(context.id, result.context.status);
    for (const domainEvent of result.events) {
      await this.auditService.record({
        tenant,
        actorType: actor.type,
        actorId: actor.id,
        eventType: domainEvent.type,
        resourceType: 'deletion_request',
        resourceId: context.id,
      });
    }
    return result.context;
  }
}
