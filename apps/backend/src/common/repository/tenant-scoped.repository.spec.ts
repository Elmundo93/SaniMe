import { eq } from 'drizzle-orm';
import { PgDialect, pgTable, uuid } from 'drizzle-orm/pg-core';
import { TenantScopedRepository } from './tenant-scoped.repository';
import { DEFAULT_TENANT_CONTEXT, type TenantContext } from './tenant-context';

const testTable = pgTable('test_table', { organizationId: uuid('organization_id').notNull() });
const dialect = new PgDialect();

// tenantFilter() is a pure predicate builder — it never touches `this.db` —
// so this proves the always-applied organization_id filter without needing
// a real database connection. Compared via the dialect's rendered
// {sql, params} instead of the SQL object itself, since that object holds
// circular table<->column references that JSON.stringify can't serialize.
class FixtureRepository extends TenantScopedRepository {
  constructor() {
    super({} as never);
  }

  filterForTenant(tenant: TenantContext = DEFAULT_TENANT_CONTEXT) {
    return this.tenantFilter(testTable.organizationId, tenant);
  }
}

describe('TenantScopedRepository', () => {
  it('always applies the organization_id predicate for the default tenant', () => {
    const repository = new FixtureRepository();
    const condition = repository.filterForTenant();
    const expected = eq(testTable.organizationId, DEFAULT_TENANT_CONTEXT.organizationId);
    expect(dialect.sqlToQuery(condition)).toEqual(dialect.sqlToQuery(expected));
  });

  it('scopes to whichever tenant context is passed, not a hardcoded default', () => {
    const repository = new FixtureRepository();
    const other: TenantContext = { organizationId: 'other-org' };
    const condition = repository.filterForTenant(other);
    const expected = eq(testTable.organizationId, 'other-org');
    expect(dialect.sqlToQuery(condition)).toEqual(dialect.sqlToQuery(expected));
  });
});
