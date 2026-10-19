import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../../db/client';
import { consents } from '../../db/schema';
import { TenantScopedRepository } from '../../common/repository/tenant-scoped.repository';
import type { TenantContext } from '../../common/repository/tenant-context';

@Injectable()
export class ConsentsRepository extends TenantScopedRepository {
  constructor(@Inject(DRIZZLE) db: Database) {
    super(db);
  }

  // Always inserts — every acceptance (including re-accepting the same
  // consentType after a version bump) becomes a new row. Never updates an
  // existing row; that was the Layer 1 bug this replaces (a re-accept
  // silently overwrote the prior version's record, leaving no history).
  // uebernommenVonGrantId: gesetzt, wenn die Zeile eine dauerhafte Einwilligung
  // (consent_grants) für diese Session übernimmt statt einer neuen Zustimmung.
  async record(
    tenant: TenantContext,
    subjectId: string,
    consentType: 'agb' | 'datenschutz',
    version: string,
    ipAddress: string | null,
    uebernommenVonGrantId: string | null = null,
  ) {
    await this.db.insert(consents).values({
      organizationId: tenant.organizationId,
      subjectType: 'onboarding_session',
      subjectId,
      consentType,
      version,
      acceptedAt: new Date(),
      ipAddress,
      uebernommenVonGrantId,
    });
  }

  async findLatest(tenant: TenantContext, subjectId: string, consentType: 'agb' | 'datenschutz') {
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
      .orderBy(desc(consents.acceptedAt))
      .limit(1);
    return row ?? null;
  }

  async findHistoryForSubject(tenant: TenantContext, subjectType: string, subjectId: string) {
    return this.db
      .select()
      .from(consents)
      .where(
        and(
          this.tenantFilter(consents.organizationId, tenant),
          eq(consents.subjectType, subjectType),
          eq(consents.subjectId, subjectId),
        ),
      )
      .orderBy(asc(consents.acceptedAt));
  }

  // A customer may run onboarding more than once (each session gets its own
  // consent rows — fresh or taken over from a consent_grant), so this can span rows from several distinct
  // onboarding_session subjectIds, all backfilled to the same customerId.
  async findHistoryForCustomer(tenant: TenantContext, customerId: string) {
    return this.db
      .select()
      .from(consents)
      .where(and(this.tenantFilter(consents.organizationId, tenant), eq(consents.customerId, customerId)))
      .orderBy(asc(consents.acceptedAt));
  }

  // Backfills customerId once a session is claimed — subjectType/subjectId
  // stay 'onboarding_session'/the session id permanently, same pattern as
  // InsurancePoliciesRepository.claimToCustomer.
  async claimToCustomer(tenant: TenantContext, subjectType: string, subjectId: string, customerId: string) {
    await this.db
      .update(consents)
      .set({ customerId })
      .where(
        and(
          this.tenantFilter(consents.organizationId, tenant),
          eq(consents.subjectType, subjectType),
          eq(consents.subjectId, subjectId),
        ),
      );
  }
}
