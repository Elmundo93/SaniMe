import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { DeletionRequestWorkflow, type DeletionRequestContext } from '@sanime/domain';
import { DEFAULT_TENANT_CONTEXT } from '../../../common/repository/tenant-context';
import { recordDeletionExecuteDuration } from '../../../common/metrics/metrics';
import { withSpan } from '../../../common/tracing/tracer';
import { AuditService } from '../../audit/audit.service';
import { JOB_QUEUE, type JobHandler, type JobQueue } from '../../job-queue/ports/job-queue.port';
import { DeletionExecutor } from '../deletion-executor';
import { DeletionRequestsRepository } from '../deletion-requests.repository';

interface DeletionExecutePayload {
  requestId: string;
}

// Registers once, per-enqueue only (like DataExportGenerateJobHandler) —
// only ever runs when DeletionRequestsService.startExecution enqueues it.
@Injectable()
export class DeletionExecuteJobHandler implements JobHandler<DeletionExecutePayload>, OnModuleInit {
  readonly jobName = 'deletion-request.execute';
  private readonly logger = new Logger(DeletionExecuteJobHandler.name);

  constructor(
    @Inject(JOB_QUEUE) private readonly jobQueue: JobQueue,
    private readonly requests: DeletionRequestsRepository,
    private readonly executor: DeletionExecutor,
    private readonly auditService: AuditService,
  ) {}

  onModuleInit() {
    this.jobQueue.registerHandler(this);
  }

  // Span + duration histogram together — async job latency (pseudonymization
  // across several tables) is exactly what that pairing exists to surface.
  async handle({ requestId }: DeletionExecutePayload): Promise<void> {
    const start = Date.now();
    try {
      await withSpan('DeletionExecuteJobHandler.handle', (span) => {
        span.setAttribute('deletion_request.id', requestId);
        return this.handleInner(requestId);
      });
    } finally {
      recordDeletionExecuteDuration(Date.now() - start);
    }
  }

  private async handleInner(requestId: string): Promise<void> {
    const row = await this.requests.findByIdUntenanted(requestId);
    if (!row) {
      this.logger.warn(`Löschanfrage "${requestId}" nicht gefunden`);
      return;
    }

    try {
      await this.executor.execute(row.customerId);

      // The domain workflow has no formal 'failed' state — a failed
      // execution simply leaves status at 'executing' with failureReason
      // set (see deletion-request.schema.ts), for an admin to investigate.
      const context: DeletionRequestContext = { id: row.id, status: 'executing', customerSupplyStatuses: [] };
      const result = DeletionRequestWorkflow.transition(context, { type: 'ExecutionCompleted' });
      if (!result.ok) {
        throw new Error(result.reason);
      }
      await this.requests.setStatus(requestId, result.context.status);
      await this.requests.setExecutedAt(requestId);
      for (const domainEvent of result.events) {
        await this.auditService.record({
          tenant: DEFAULT_TENANT_CONTEXT,
          actorType: 'system',
          actorId: null,
          eventType: domainEvent.type,
          resourceType: 'deletion_request',
          resourceId: requestId,
        });
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unbekannter Fehler';
      await this.requests.setFailureReason(requestId, reason);
      throw error; // let InProcessJobQueue's own retry/backoff apply
    }
  }
}
