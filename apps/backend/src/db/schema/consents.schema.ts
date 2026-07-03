import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { customers } from './customers.schema';
import { organizations } from './organizations.schema';

// Layer 4: versioned (append-only — every acceptance is a new row, never an
// update; see modules/consents/consents.repository.ts). subjectType/subjectId
// always stay 'onboarding_session'/the session id, even after a customer is
// identified — customerId is backfilled at claim time instead, same
// "backfilled at claim time" pattern as insurance_policies/ocr_results, so a
// customer's full consent history across every onboarding session they've
// ever run is queryable directly by customerId (Layer 4's data export).
export const consents = pgTable('consents', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id),
  subjectType: text('subject_type').notNull(), // 'customer' | 'onboarding_session'
  subjectId: text('subject_id').notNull(),
  customerId: uuid('customer_id').references(() => customers.id), // backfilled at claim time
  consentType: text('consent_type').notNull(), // 'agb' | 'datenschutz'
  version: text('version').notNull(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }).notNull(),
  // Einwilligung.ipAdresse per @sanime/domain/types.ts's own comment: "vom
  // Backend beim Sync gesetzt, nie client-seitig" — set here, never from a
  // client-supplied value.
  ipAddress: text('ip_address'),
});

export type Consent = typeof consents.$inferSelect;
export type NewConsent = typeof consents.$inferInsert;
