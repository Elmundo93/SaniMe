import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../../db/client';
import { documents } from '../../db/schema';
import { TenantScopedRepository } from '../../common/repository/tenant-scoped.repository';
import type { TenantContext } from '../../common/repository/tenant-context';

@Injectable()
export class DocumentsRepository extends TenantScopedRepository {
  constructor(@Inject(DRIZZLE) db: Database) {
    super(db);
  }

  async create(tenant: TenantContext, type: string) {
    const [row] = await this.db
      .insert(documents)
      .values({ organizationId: tenant.organizationId, type, status: 'pending_upload' })
      .returning();
    return row;
  }

  async findById(tenant: TenantContext, id: string) {
    const [row] = await this.db
      .select()
      .from(documents)
      .where(and(this.tenantFilter(documents.organizationId, tenant), eq(documents.id, id)))
      .limit(1);
    return row ?? null;
  }

  async setCurrentVersion(tenant: TenantContext, id: string, versionId: string) {
    await this.db
      .update(documents)
      .set({ currentVersionId: versionId, status: 'uploaded' })
      .where(and(this.tenantFilter(documents.organizationId, tenant), eq(documents.id, id)));
  }

  async setStatus(tenant: TenantContext, id: string, status: string) {
    await this.db
      .update(documents)
      .set({ status })
      .where(and(this.tenantFilter(documents.organizationId, tenant), eq(documents.id, id)));
  }
}
