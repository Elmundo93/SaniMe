import { boolean, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { customers } from './customers.schema';
import { documents } from './documents.schema';
import { ocrResults } from './health-data.schema';
import { organizations } from './organizations.schema';
import { products, supplierProducts } from './catalog.schema';
import { supplies } from './supply-order.schema';

// Mirrors @sanime/domain's OnboardingSession, but as normalized DB columns
// rather than one nested object — sessionSecretHash never stores the raw
// secret (SHA-256, not bcrypt: a 32-random-byte opaque secret already has
// enough entropy that a fast hash is correct, and it must be fast since it
// runs on every authenticated customer request, not just login).
export const onboardingSessions = pgTable('onboarding_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id),
  sessionSecretHash: text('session_secret_hash').notNull().unique(),
  status: text('status').notNull().default('WILLKOMMEN'),
  customerId: uuid('customer_id').references(() => customers.id),

  prescriptionDocumentId: uuid('prescription_document_id').references(() => documents.id),
  insuranceCardDocumentId: uuid('insurance_card_document_id').references(() => documents.id),
  insuranceCardSkipped: boolean('insurance_card_skipped').notNull().default(false),
  ocrResultId: uuid('ocr_result_id').references(() => ocrResults.id),

  selectedProductId: uuid('selected_product_id').references(() => products.id),
  selectedSupplierProductId: uuid('selected_supplier_product_id').references(() => supplierProducts.id),
  availableProductIds: jsonb('available_product_ids').notNull().default([]),

  // Deliberately JSON, not a real `appointments` table — real
  // supplier-calendar logic is Layer 3; same "seam now, capacity later"
  // pattern the doc already uses elsewhere.
  appointmentSlotsJson: jsonb('appointment_slots_json').notNull().default([]),
  selectedAppointmentJson: jsonb('selected_appointment_json'),

  bindingConfirmation: boolean('binding_confirmation').notNull().default(false),
  contactEmail: text('contact_email'),
  contactPhone: text('contact_phone'),
  contactPhoneVerified: boolean('contact_phone_verified').notNull().default(false),

  supplyId: uuid('supply_id').references(() => supplies.id),
  completedAt: timestamp('completed_at', { withTimezone: true }),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type OnboardingSessionRow = typeof onboardingSessions.$inferSelect;
export type NewOnboardingSessionRow = typeof onboardingSessions.$inferInsert;
