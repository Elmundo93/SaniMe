import { boolean, integer, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { organizations } from './organizations.schema';

// Additive to, not replacing, verification-codes.schema.ts's own cleanup job
// — that job is OTP-hygiene infra unrelated to a data subject's rights and
// keeps its own name/interval untouched. This table is a separate,
// business/compliance-data-lifecycle concern. resourceType keys match
// retention-executors.ts's RETENTION_EXECUTORS lookup table.
export const retentionPolicies = pgTable(
  'retention_policies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    resourceType: text('resource_type').notNull(),
    retentionDays: integer('retention_days').notNull(),
    action: text('action').notNull(), // 'delete' | 'anonymize'
    enabled: boolean('enabled').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    // One policy per resourceType per org — makes the seed script's
    // onConflictDoNothing() idempotent, same discipline as
    // supplier_products' own unique constraint.
    orgResourceUnique: unique().on(table.organizationId, table.resourceType),
  }),
);

export type RetentionPolicy = typeof retentionPolicies.$inferSelect;
export type NewRetentionPolicy = typeof retentionPolicies.$inferInsert;
