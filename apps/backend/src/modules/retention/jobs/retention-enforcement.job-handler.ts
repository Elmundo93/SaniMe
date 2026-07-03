import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { DRIZZLE, type Database } from '../../../db/client';
import { DEFAULT_TENANT_CONTEXT } from '../../../common/repository/tenant-context';
import { DataExportRequestsRepository } from '../../data-export/data-export-requests.repository';
import { STORAGE_PROVIDER, type StorageProvider } from '../../document/ports/storage-provider.port';
import { JOB_QUEUE, type JobHandler, type JobQueue } from '../../job-queue/ports/job-queue.port';
import { createRetentionExecutors, type RetentionExecutor } from '../retention-executors';
import { RetentionPoliciesRepository } from '../retention-policies.repository';

const ENFORCEMENT_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24h

// Additive to, not replacing, VerificationCleanupJobHandler — same
// self-registering + self-enqueuing OnModuleInit pattern, distinct job name,
// coexists in the same InProcessJobQueue handler map.
@Injectable()
export class RetentionEnforcementJobHandler implements JobHandler<Record<string, never>>, OnModuleInit {
  readonly jobName = 'retention.enforce';
  private readonly logger = new Logger(RetentionEnforcementJobHandler.name);
  private readonly executors: Record<string, RetentionExecutor>;

  constructor(
    @Inject(JOB_QUEUE) private readonly jobQueue: JobQueue,
    @Inject(DRIZZLE) db: Database,
    @Inject(STORAGE_PROVIDER) storage: StorageProvider,
    private readonly policies: RetentionPoliciesRepository,
    dataExportRequests: DataExportRequestsRepository,
  ) {
    this.executors = createRetentionExecutors({ db, storage, dataExportRequests });
  }

  onModuleInit() {
    this.jobQueue.registerHandler(this);
    void this.jobQueue.enqueue(this.jobName, {}, { repeat: { everyMs: ENFORCEMENT_INTERVAL_MS } });
  }

  async handle(): Promise<void> {
    const enabled = await this.policies.listEnabled(DEFAULT_TENANT_CONTEXT);
    for (const policy of enabled) {
      const executor = this.executors[policy.resourceType];
      if (!executor) {
        this.logger.warn(`Kein Executor für Retention-Policy "${policy.resourceType}" registriert`);
        continue;
      }
      await executor(DEFAULT_TENANT_CONTEXT, policy.retentionDays);
    }
  }
}
