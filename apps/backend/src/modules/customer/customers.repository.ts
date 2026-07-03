import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DRIZZLE, type Database } from '../../db/client';
import { customers } from '../../db/schema';
import { TenantScopedRepository } from '../../common/repository/tenant-scoped.repository';
import type { TenantContext } from '../../common/repository/tenant-context';

// Normalization matches the client's current sucheKundeImArchiv exactly
// (lib/mockKundenArchiv.ts): trim + uppercase, exact match only, no fuzzy
// name/DOB cross-check.
export function normalizeInsuredNumber(value: string): string {
  return value.trim().toUpperCase();
}

@Injectable()
export class CustomersRepository extends TenantScopedRepository {
  constructor(@Inject(DRIZZLE) db: Database) {
    super(db);
  }

  async findByInsuredNumber(tenant: TenantContext, insuredNumber: string) {
    const [row] = await this.db
      .select()
      .from(customers)
      .where(
        and(
          this.tenantFilter(customers.organizationId, tenant),
          eq(customers.insuredNumber, normalizeInsuredNumber(insuredNumber)),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async findById(tenant: TenantContext, id: string) {
    const [row] = await this.db
      .select()
      .from(customers)
      .where(and(this.tenantFilter(customers.organizationId, tenant), eq(customers.id, id)))
      .limit(1);
    return row ?? null;
  }

  async create(
    tenant: TenantContext,
    input: { firstName: string; lastName: string; email?: string | null; phone?: string | null; insuredNumber: string },
  ) {
    const [row] = await this.db
      .insert(customers)
      .values({ organizationId: tenant.organizationId, ...input, insuredNumber: normalizeInsuredNumber(input.insuredNumber) })
      .returning();
    return row;
  }

  async update(
    tenant: TenantContext,
    id: string,
    patch: Partial<{ email: string | null; phone: string | null }>,
  ) {
    await this.db
      .update(customers)
      .set(patch)
      .where(and(this.tenantFilter(customers.organizationId, tenant), eq(customers.id, id)));
  }
}
