import { Inject, Injectable } from '@nestjs/common';
import { DRIZZLE, type Database } from '../../db/client';
import { accessLogs } from '../../db/schema';
import { TenantScopedRepository } from '../../common/repository/tenant-scoped.repository';
import type { TenantContext } from '../../common/repository/tenant-context';

export interface RecordAccessInput {
  tenant: TenantContext;
  actorType: 'customer' | 'admin' | 'system';
  actorId: string | null;
  resourceType: string;
  resourceId: string | null;
}

@Injectable()
export class AccessLogsRepository extends TenantScopedRepository {
  constructor(@Inject(DRIZZLE) db: Database) {
    super(db);
  }

  async record(input: RecordAccessInput) {
    await this.db.insert(accessLogs).values({
      organizationId: input.tenant.organizationId,
      actorType: input.actorType,
      actorId: input.actorId,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
    });
  }
}
