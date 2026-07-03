import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { JOB_QUEUE, type JobHandler, type JobQueue } from '../../job-queue/ports/job-queue.port';
import { VerificationCodesRepository } from '../verification-codes.repository';

const CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6h

// Gives "Cleanup" (Layer 1 Principle 10's named job type) a real target —
// expired/consumed OTP rows — without touching any Layer 2 business table.
@Injectable()
export class VerificationCleanupJobHandler implements JobHandler<Record<string, never>>, OnModuleInit {
  readonly jobName = 'verification-codes.cleanup';
  private readonly logger = new Logger(VerificationCleanupJobHandler.name);

  constructor(
    @Inject(JOB_QUEUE) private readonly jobQueue: JobQueue,
    private readonly repository: VerificationCodesRepository,
  ) {}

  onModuleInit() {
    this.jobQueue.registerHandler(this);
    void this.jobQueue.enqueue(this.jobName, {}, { repeat: { everyMs: CLEANUP_INTERVAL_MS } });
  }

  async handle(): Promise<void> {
    const deletedCount = await this.repository.deleteExpired();
    if (deletedCount > 0) {
      this.logger.log(`${deletedCount} abgelaufene/verbrauchte Verification-Codes bereinigt`);
    }
  }
}
