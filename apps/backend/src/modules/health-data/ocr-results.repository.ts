import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../../db/client';
import { ocrResults, type NewOcrResultRow } from '../../db/schema';
import { TenantScopedRepository } from '../../common/repository/tenant-scoped.repository';
import type { TenantContext } from '../../common/repository/tenant-context';

@Injectable()
export class OcrResultsRepository extends TenantScopedRepository {
  constructor(@Inject(DRIZZLE) db: Database) {
    super(db);
  }

  async create(tenant: TenantContext, input: Omit<NewOcrResultRow, 'organizationId' | 'id' | 'createdAt'>) {
    const [row] = await this.db
      .insert(ocrResults)
      .values({ organizationId: tenant.organizationId, ...input })
      .returning();
    return row;
  }

  async findBySubject(tenant: TenantContext, subjectType: string, subjectId: string) {
    const [row] = await this.db
      .select()
      .from(ocrResults)
      .where(
        and(
          this.tenantFilter(ocrResults.organizationId, tenant),
          eq(ocrResults.subjectType, subjectType),
          eq(ocrResults.subjectId, subjectId),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async findById(tenant: TenantContext, id: string) {
    const [row] = await this.db
      .select()
      .from(ocrResults)
      .where(and(this.tenantFilter(ocrResults.organizationId, tenant), eq(ocrResults.id, id)))
      .limit(1);
    return row ?? null;
  }

  // Backs the FELD_KORRIGIERT event — the customer editing an OCR-derived
  // field before confirming (CLAUDE.md: OCR output is never final).
  async patchFields(tenant: TenantContext, id: string, patch: Partial<NewOcrResultRow>) {
    await this.db
      .update(ocrResults)
      .set({ ...patch, rawEdited: true })
      .where(and(this.tenantFilter(ocrResults.organizationId, tenant), eq(ocrResults.id, id)));
  }
}
