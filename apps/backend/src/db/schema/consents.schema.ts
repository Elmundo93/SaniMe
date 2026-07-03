import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { organizations } from './organizations.schema';

// Minimal placeholder per Principle 15 — the compliance module's schema is
// prepared in Layer 1 alongside auth, so HealthData never has to run without
// an audit trail even briefly. Full versioning/roles/exports/deletion
// differentiation happens in Layer 4; this only reserves the table shape.
export const consents = pgTable('consents', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id),
  subjectType: text('subject_type').notNull(), // 'customer' | 'onboarding_session'
  subjectId: text('subject_id').notNull(),
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
