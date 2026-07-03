import { pgTable, primaryKey, text, uuid } from 'drizzle-orm/pg-core';
import { organizations } from './organizations.schema';

// Minimal RBAC groundwork for Layer 1: one row per (admin_user, permission).
// Full role differentiation (named roles, role hierarchy, per-org role sets)
// is fleshed out in Layer 4 — this only has to exist so guards can check
// "does this admin have permission X" from day 1.
export const rolePermissions = pgTable(
  'role_permissions',
  {
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    adminUserId: uuid('admin_user_id').notNull(),
    permission: text('permission').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.adminUserId, table.permission] }),
  }),
);

export type RolePermission = typeof rolePermissions.$inferSelect;
export type NewRolePermission = typeof rolePermissions.$inferInsert;
