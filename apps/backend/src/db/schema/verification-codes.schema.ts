import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// No organizationId — same precedent as idempotency_keys (Layer 1): a
// tenant-agnostic security/dedupe artifact, not a business record.
export const verificationCodes = pgTable('verification_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  target: text('target').notNull(), // phone number or email
  purpose: text('purpose').notNull(), // e.g. 'onboarding_phone'
  codeHmac: text('code_hmac').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  attempts: integer('attempts').notNull().default(0),
  consumedAt: timestamp('consumed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type VerificationCode = typeof verificationCodes.$inferSelect;
export type NewVerificationCode = typeof verificationCodes.$inferInsert;
