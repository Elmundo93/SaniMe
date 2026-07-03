import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { adminUsers } from './admin-users.schema';
import { customers } from './customers.schema';
import { organizations } from './organizations.schema';

// reasonCode is a fixed small enum, not free text — a customer-authored
// free-text "reason" field would itself be exactly the kind of PII this
// whole module exists to eventually erase.
export const DELETION_REASON_CODES = ['account_closed', 'not_using_app', 'privacy_concern', 'other'] as const;
export type DeletionReasonCode = (typeof DELETION_REASON_CODES)[number];

export const deletionRequests = pgTable('deletion_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => customers.id),
  requestedByType: text('requested_by_type').notNull(), // 'customer' | 'admin'
  requestedById: text('requested_by_id').notNull(),
  status: text('status').notNull().default('requested'), // DeletionRequestStatus from @sanime/domain
  reasonCode: text('reason_code'), // one of DELETION_REASON_CODES
  reviewedByAdminId: uuid('reviewed_by_admin_id').references(() => adminUsers.id),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  reviewNote: text('review_note'), // admin-authored, not customer PII
  // Diagnostic only — the domain workflow has no formal 'failed' state (see
  // deletion-requests.service.ts); a failed execution simply leaves status
  // at 'executing' with this populated, for an admin to investigate.
  failureReason: text('failure_reason'),
  requestedAt: timestamp('requested_at', { withTimezone: true }).notNull().defaultNow(),
  executedAt: timestamp('executed_at', { withTimezone: true }),
});

export type DeletionRequestRow = typeof deletionRequests.$inferSelect;
export type NewDeletionRequestRow = typeof deletionRequests.$inferInsert;
