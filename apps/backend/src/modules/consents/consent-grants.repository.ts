import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../../db/client';
import { consentGrants } from '../../db/schema';
import { TenantScopedRepository } from '../../common/repository/tenant-scoped.repository';
import type { TenantContext } from '../../common/repository/tenant-context';

// Dauerhafte Einwilligung (Katalogplan §2.3). Ein Grant ist nur ein Verweis
// „diese Person hat AGB/Datenschutz in Fassung X zugestimmt“ — die eigentlichen
// Zustimmungen bleiben append-only in `consents`. Der Token liegt nur als
// SHA-256-Hash vor, wie das Session-Secret.
@Injectable()
export class ConsentGrantsRepository extends TenantScopedRepository {
  constructor(@Inject(DRIZZLE) db: Database) {
    super(db);
  }

  async create(
    tenant: TenantContext,
    values: { tokenHash: string; onboardingSessionId: string; customerId: string | null; agbVersion: string; datenschutzVersion: string },
  ) {
    const [row] = await this.db
      .insert(consentGrants)
      .values({ organizationId: tenant.organizationId, ...values })
      .returning();
    return row;
  }

  async findActiveByTokenHash(tenant: TenantContext, tokenHash: string) {
    const [row] = await this.db
      .select()
      .from(consentGrants)
      .where(
        and(
          this.tenantFilter(consentGrants.organizationId, tenant),
          eq(consentGrants.tokenHash, tokenHash),
          isNull(consentGrants.revokedAt),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async findLatestActiveForCustomer(tenant: TenantContext, customerId: string) {
    const [row] = await this.db
      .select()
      .from(consentGrants)
      .where(
        and(
          this.tenantFilter(consentGrants.organizationId, tenant),
          eq(consentGrants.customerId, customerId),
          isNull(consentGrants.revokedAt),
        ),
      )
      .orderBy(desc(consentGrants.createdAt))
      .limit(1);
    return row ?? null;
  }

  async existsForSession(tenant: TenantContext, onboardingSessionId: string) {
    const [row] = await this.db
      .select({ id: consentGrants.id })
      .from(consentGrants)
      .where(
        and(
          this.tenantFilter(consentGrants.organizationId, tenant),
          eq(consentGrants.onboardingSessionId, onboardingSessionId),
        ),
      )
      .limit(1);
    return Boolean(row);
  }

  // Beim Claim (Krankenkassenkarten-Abgleich): Grants dieser Session gehören ab
  // jetzt dem Kunden — für Widerruf „alle Grants des Kunden“, Export und Löschung.
  async claimToCustomer(tenant: TenantContext, onboardingSessionId: string, customerId: string) {
    await this.db
      .update(consentGrants)
      .set({ customerId })
      .where(
        and(
          this.tenantFilter(consentGrants.organizationId, tenant),
          eq(consentGrants.onboardingSessionId, onboardingSessionId),
        ),
      );
  }

  async revokeById(tenant: TenantContext, id: string) {
    await this.db
      .update(consentGrants)
      .set({ revokedAt: new Date() })
      .where(and(this.tenantFilter(consentGrants.organizationId, tenant), eq(consentGrants.id, id), isNull(consentGrants.revokedAt)));
  }

  async revokeForCustomer(tenant: TenantContext, customerId: string) {
    await this.db
      .update(consentGrants)
      .set({ revokedAt: new Date() })
      .where(
        and(
          this.tenantFilter(consentGrants.organizationId, tenant),
          eq(consentGrants.customerId, customerId),
          isNull(consentGrants.revokedAt),
        ),
      );
  }

  // Art. 15/20-Export: ohne tokenHash — der Hash ist ein Zugangsmerkmal, kein
  // personenbezogenes Datum des Kunden.
  listForCustomer(tenant: TenantContext, customerId: string) {
    return this.db
      .select({
        id: consentGrants.id,
        agbVersion: consentGrants.agbVersion,
        datenschutzVersion: consentGrants.datenschutzVersion,
        createdAt: consentGrants.createdAt,
        revokedAt: consentGrants.revokedAt,
      })
      .from(consentGrants)
      .where(and(this.tenantFilter(consentGrants.organizationId, tenant), eq(consentGrants.customerId, customerId)));
  }
}
