// The permission taxonomy RolesGuard/@Roles(...) check against
// role_permissions. Sized to gate what actually exists today, not one
// permission per route — see work/Backendsprint.md Layer 4.
//
// Only ever applied alongside AdminJwtAuthGuard, never on an
// AnyPrincipalAuthGuard route — those are reachable by customer sessions
// too, which hold no role_permissions row and aren't subject to RBAC at all
// (their authorization model is ownership-based, see
// current-principal.decorator.ts's resolveOwnerFilter, not permission-based).
export const PERMISSIONS = ['orders:read', 'orders:write', 'health-data:write', 'compliance:read', 'compliance:manage'] as const;

export type Permission = (typeof PERMISSIONS)[number];
