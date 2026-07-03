import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../../db/client';
import { insurancePolicies, type NewInsurancePolicy } from '../../db/schema';
import { TenantScopedRepository } from '../../common/repository/tenant-scoped.repository';
import type { TenantContext } from '../../common/repository/tenant-context';

@Injectable()
export class InsurancePoliciesRepository extends TenantScopedRepository {
  constructor(@Inject(DRIZZLE) db: Database) {
    super(db);
  }

  async upsertForSubject(tenant: TenantContext, input: Omit<NewInsurancePolicy, 'organizationId' | 'id' | 'createdAt'>) {
    const existing = await this.findBySubject(tenant, input.subjectType, input.subjectId);
    if (existing) {
      await this.db
        .update(insurancePolicies)
        .set(input)
        .where(and(this.tenantFilter(insurancePolicies.organizationId, tenant), eq(insurancePolicies.id, existing.id)));
      return { ...existing, ...input };
    }
    const [row] = await this.db
      .insert(insurancePolicies)
      .values({ organizationId: tenant.organizationId, ...input })
      .returning();
    return row;
  }

  async findBySubject(tenant: TenantContext, subjectType: string, subjectId: string) {
    const [row] = await this.db
      .select()
      .from(insurancePolicies)
      .where(
        and(
          this.tenantFilter(insurancePolicies.organizationId, tenant),
          eq(insurancePolicies.subjectType, subjectType),
          eq(insurancePolicies.subjectId, subjectId),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async claimToCustomer(tenant: TenantContext, subjectType: string, subjectId: string, customerId: string) {
    await this.db
      .update(insurancePolicies)
      .set({ customerId })
      .where(
        and(
          this.tenantFilter(insurancePolicies.organizationId, tenant),
          eq(insurancePolicies.subjectType, subjectType),
          eq(insurancePolicies.subjectId, subjectId),
        ),
      );
  }
}
