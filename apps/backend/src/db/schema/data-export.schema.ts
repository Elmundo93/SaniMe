import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { customers } from './customers.schema';
import { organizations } from './organizations.schema';

// Generation is async via JobQueue (Principle 10 names "Exports" as a
// JobQueue consumer) — the row is created 'pending' immediately, a job
// builds the bundle and uploads it, then flips the row to 'ready'/'failed'.
export const dataExportRequests = pgTable('data_export_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => customers.id),
  requestedByType: text('requested_by_type').notNull(), // 'customer' | 'admin'
  requestedById: text('requested_by_id').notNull(),
  status: text('status').notNull().default('pending'), // 'pending' | 'processing' | 'ready' | 'failed' | 'expired'
  storageKey: text('storage_key'),
  failureReason: text('failure_reason'),
  requestedAt: timestamp('requested_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
});

export type DataExportRequest = typeof dataExportRequests.$inferSelect;
export type NewDataExportRequest = typeof dataExportRequests.$inferInsert;
