import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { DEFAULT_TENANT_CONTEXT } from '../../../common/repository/tenant-context';
import { recordDataExportDuration } from '../../../common/metrics/metrics';
import { withSpan } from '../../../common/tracing/tracer';
import { STORAGE_PROVIDER, type StorageProvider } from '../../document/ports/storage-provider.port';
import { JOB_QUEUE, type JobHandler, type JobQueue } from '../../job-queue/ports/job-queue.port';
import { DataExportPayloadBuilder } from '../data-export-payload.builder';
import { DataExportRequestsRepository } from '../data-export-requests.repository';

const EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

interface DataExportGeneratePayload {
  requestId: string;
}

// Registers once, per-enqueue only (unlike VerificationCleanupJobHandler's
// self-scheduled repeat) — this job only ever runs when a real export was
// requested. The storage key is deterministic per requestId, so a retry
// after a transient failure simply overwrites the same object.
@Injectable()
export class DataExportGenerateJobHandler implements JobHandler<DataExportGeneratePayload>, OnModuleInit {
  readonly jobName = 'data-export.generate';
  private readonly logger = new Logger(DataExportGenerateJobHandler.name);

  constructor(
    @Inject(JOB_QUEUE) private readonly jobQueue: JobQueue,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
    private readonly requests: DataExportRequestsRepository,
    private readonly payloadBuilder: DataExportPayloadBuilder,
  ) {}

  onModuleInit() {
    this.jobQueue.registerHandler(this);
  }

  // Span + duration histogram together — async job latency (retries, storage
  // upload time) is exactly what that pairing exists to surface.
  async handle({ requestId }: DataExportGeneratePayload): Promise<void> {
    const start = Date.now();
    try {
      await withSpan('DataExportGenerateJobHandler.handle', (span) => {
        span.setAttribute('data_export.request_id', requestId);
        return this.handleInner(requestId);
      });
    } finally {
      recordDataExportDuration(Date.now() - start);
    }
  }

  private async handleInner(requestId: string): Promise<void> {
    const request = await this.requests.findByIdUntenanted(requestId);
    if (!request) {
      this.logger.warn(`Export-Anfrage "${requestId}" nicht gefunden`);
      return;
    }

    await this.requests.setProcessing(requestId);

    try {
      const payload = await this.payloadBuilder.build(DEFAULT_TENANT_CONTEXT, request.customerId);
      const storageKey = `exports/${requestId}.json`;
      await this.storage.putObject(storageKey, JSON.stringify(payload), 'application/json');
      await this.requests.setReady(requestId, storageKey, new Date(Date.now() + EXPIRY_MS));
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unbekannter Fehler';
      await this.requests.setFailed(requestId, reason);
      throw error; // let InProcessJobQueue's own retry/backoff apply
    }
  }
}
