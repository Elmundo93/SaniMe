import { Global, Module } from '@nestjs/common';
import { JOB_QUEUE } from './ports/job-queue.port';
import { InProcessJobQueue } from './providers/in-process-job-queue.provider';

@Global()
@Module({
  providers: [{ provide: JOB_QUEUE, useClass: InProcessJobQueue }],
  exports: [JOB_QUEUE],
})
export class JobQueueModule {}
