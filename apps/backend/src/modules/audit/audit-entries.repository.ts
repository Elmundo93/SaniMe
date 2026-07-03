import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE, type Database } from '../../db/client';
import { auditEntries } from '../../db/schema';
import { TenantScopedRepository } from '../../common/repository/tenant-scoped.repository';
import type { TenantContext } from '../../common/repository/tenant-context';

export interface RecordAuditEntryInput {
  tenant: TenantContext;
  actorType: 'customer' | 'admin' | 'system';
  actorId: string | null;
  eventType: string;
  resourceType: string;
  resourceId: string | null;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditEntriesRepository extends TenantScopedRepository {
  constructor(@Inject(DRIZZLE) db: Database) {
    super(db);
  }

  async record(input: RecordAuditEntryInput) {
    await this.db.insert(auditEntries).values({
      organizationId: input.tenant.organizationId,
      actorType: input.actorType,
      actorId: input.actorId,
      eventType: input.eventType,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      metadata: input.metadata ?? {},
    });
  }
}
