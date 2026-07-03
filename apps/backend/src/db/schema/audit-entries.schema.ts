import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { organizations } from './organizations.schema';

// One row per business-relevant state change (domain event). Layer 1 defines
// the shape and lets AuditService write to it; real callers (SupplyCreated,
// InsuranceApproved, ...) arrive with Layer 2's event-emitting modules.
export const auditEntries = pgTable('audit_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id),
  actorType: text('actor_type').notNull(), // 'customer' | 'admin' | 'system'
  actorId: text('actor_id'),
  eventType: text('event_type').notNull(),
  resourceType: text('resource_type').notNull(),
  resourceId: text('resource_id'),
  metadata: jsonb('metadata').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type AuditEntry = typeof auditEntries.$inferSelect;
export type NewAuditEntry = typeof auditEntries.$inferInsert;
