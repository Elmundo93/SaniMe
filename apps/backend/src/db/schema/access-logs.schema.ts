import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { organizations } from './organizations.schema';

// Written by the access-log interceptor (see common/audit/access-log.interceptor.ts)
// on every @AuditRead()-decorated read. This is the mechanism that makes the
// Health-Data-separation principle enforceable rather than just documented —
// every sensitive read leaves a row here, not only the ones someone remembers to log.
export const accessLogs = pgTable('access_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id),
  actorType: text('actor_type').notNull(), // 'customer' | 'admin' | 'system'
  actorId: text('actor_id'),
  resourceType: text('resource_type').notNull(),
  resourceId: text('resource_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type AccessLog = typeof accessLogs.$inferSelect;
export type NewAccessLog = typeof accessLogs.$inferInsert;
