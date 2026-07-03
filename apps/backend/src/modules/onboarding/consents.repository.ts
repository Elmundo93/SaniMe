import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../../db/client';
import { consents } from '../../db/schema';
import { TenantScopedRepository } from '../../common/repository/tenant-scoped.repository';
import type { TenantContext } from '../../common/repository/tenant-context';

@Injectable()
export class ConsentsRepository extends TenantScopedRepository {
  constructor(@Inject(DRIZZLE) db: Database) {
    super(db);
  }

  async upsert(
    tenant: TenantContext,
    subjectId: string,
    consentType: 'agb' | 'datenschutz',
    version: string,
    ipAddress: string | null,
  ) {
    const existing = await this.findOne(tenant, subjectId, consentType);
    if (existing) {
      await this.db
        .update(consents)
        .set({ version, acceptedAt: new Date(), ipAddress })
        .where(and(this.tenantFilter(consents.organizationId, tenant), eq(consents.id, existing.id)));
      return;
    }
    await this.db.insert(consents).values({
      organizationId: tenant.organizationId,
      subjectType: 'onboarding_session',
      subjectId,
      consentType,
      version,
      acceptedAt: new Date(),
      ipAddress,
    });
  }

  async findOne(tenant: TenantContext, subjectId: string, consentType: 'agb' | 'datenschutz') {
    const [row] = await this.db
      .select()
      .from(consents)
      .where(
        and(
          this.tenantFilter(consents.organizationId, tenant),
          eq(consents.subjectType, 'onboarding_session'),
          eq(consents.subjectId, subjectId),
          eq(consents.consentType, consentType),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async findAllForSession(tenant: TenantContext, subjectId: string) {
    return this.db
      .select()
      .from(consents)
      .where(
        and(
          this.tenantFilter(consents.organizationId, tenant),
          eq(consents.subjectType, 'onboarding_session'),
          eq(consents.subjectId, subjectId),
        ),
      );
  }
}
