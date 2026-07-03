// Single-tenant pilot: every repository call takes a tenant context, but it's
// always this constant today. Multi-tenancy later is a `WHERE organization_id = ?`
// added to TenantScopedRepository, not a rewrite of every call site — see
// work/Backendsprint.md's "Fundament heute, Kapazität morgen" table.
export const DEFAULT_ORGANIZATION_ID = '00000000-0000-0000-0000-000000000001';

export interface TenantContext {
  organizationId: string;
}

export const DEFAULT_TENANT_CONTEXT: TenantContext = {
  organizationId: DEFAULT_ORGANIZATION_ID,
};
