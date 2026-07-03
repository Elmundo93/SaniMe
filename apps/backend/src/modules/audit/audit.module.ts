import { Global, Module } from '@nestjs/common';
import { AccessLogsRepository } from './access-logs.repository';
import { AuditEntriesRepository } from './audit-entries.repository';
import { AuditService } from './audit.service';

@Global()
@Module({
  providers: [AccessLogsRepository, AuditEntriesRepository, AuditService],
  exports: [AuditService],
})
export class AuditModule {}
