import { Injectable } from '@nestjs/common';
import { AccessLogsRepository, type RecordAccessInput } from './access-logs.repository';
import { AuditEntriesRepository, type RecordAuditEntryInput } from './audit-entries.repository';

// Consumers (Timeline, Push, Admin-Aufgaben, Analytics) attach to real domain
// events from Layer 2 onward — this is the write side only, per
// work/Backendsprint.md Principle 2.
@Injectable()
export class AuditService {
  constructor(
    private readonly accessLogs: AccessLogsRepository,
    private readonly auditEntries: AuditEntriesRepository,
  ) {}

  recordAccess(input: RecordAccessInput) {
    return this.accessLogs.record(input);
  }

  record(input: RecordAuditEntryInput) {
    return this.auditEntries.record(input);
  }
}
