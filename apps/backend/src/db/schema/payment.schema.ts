import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { onboardingSessions } from './onboarding-sessions.schema';
import { organizations } from './organizations.schema';
import { supplies } from './supply-order.schema';

// One row per Stripe PaymentIntent — `status` mirrors Stripe's own
// PaymentIntent.status values directly (no re-mapping), since the webhook
// handler that writes it is reacting to Stripe's event types 1:1. `supplyId`
// is null until OnboardingService.abschliessenNachZahlung() actually creates the Supply
// (which only happens once, driven by the webhook, not this row) — same
// backfill-after-the-fact pattern as consents/ocr_results' customerId.
export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id),
  onboardingSessionId: uuid('onboarding_session_id')
    .notNull()
    .references(() => onboardingSessions.id),
  supplyId: uuid('supply_id').references(() => supplies.id),
  stripePaymentIntentId: text('stripe_payment_intent_id').notNull().unique(),
  amountCents: integer('amount_cents').notNull(),
  currency: text('currency').notNull().default('eur'),
  status: text('status').notNull().default('requires_payment_method'),
  failureReason: text('failure_reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type PaymentRow = typeof payments.$inferSelect;
export type NewPaymentRow = typeof payments.$inferInsert;
