import { boolean, integer, jsonb, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
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

  availableProductIds: jsonb('available_product_ids').notNull().default([]),

  // Deliberately JSON, not a real `appointments` table — real
  // supplier-calendar logic is Layer 3; same "seam now, capacity later"
  // pattern the doc already uses elsewhere.
  appointmentSlotsJson: jsonb('appointment_slots_json').notNull().default([]),
  selectedAppointmentJson: jsonb('selected_appointment_json'),

  // Wird beim Abschluss gesetzt — das verbindliche Absenden ist der letzte
  // Knopf im Checkout, kein eigenes Event mehr.
  bindingConfirmation: boolean('binding_confirmation').notNull().default(false),
  contactEmail: text('contact_email'),
  contactPhone: text('contact_phone'),
  contactPhoneVerified: boolean('contact_phone_verified').notNull().default(false),

  // Für welche Warenkorb-Position der laufende Rezept-Scan gedacht ist (siehe
  // @sanime/domain's OnboardingSession.aktivePositionId); ocr_result_id ist
  // dabei der Zwischenstand dieses Scans, nicht das Rezept einer Position.
  activePositionProductId: uuid('active_position_product_id').references(() => products.id),

  // Erste Versorgung der Bestellung — je Position wird eine eigene angelegt.
  supplyId: uuid('supply_id').references(() => supplies.id),
  completedAt: timestamp('completed_at', { withTimezone: true }),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type OnboardingSessionRow = typeof onboardingSessions.$inferSelect;
export type NewOnboardingSessionRow = typeof onboardingSessions.$inferInsert;

// Der Warenkorb einer Bestellung: eine Zeile je Produkt (das Produkt ist
// zugleich die Positions-ID, siehe @sanime/domain's WarenkorbPosition).
// ocr_result_id ist das Rezept dieser Position — nur bei Kassenartikeln; die
// Krankenkasse dazu steht einmal je Session in insurance_policies.
export const onboardingSessionPositions = pgTable(
  'onboarding_session_positions',
  {
    onboardingSessionId: uuid('onboarding_session_id')
      .notNull()
      .references(() => onboardingSessions.id, { onDelete: 'cascade' }),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id),
    supplierProductId: uuid('supplier_product_id').references(() => supplierProducts.id),
    ocrResultId: uuid('ocr_result_id').references(() => ocrResults.id),
    // Optionaler Kontext aus der Krankheitsbild-Discovery — eine ID der
    // statischen KRANKHEITSBILD_KATALOG-Taxonomie, nur für Admin-Sichtbarkeit.
    krankheitsbildId: text('krankheitsbild_id'),
    // Kassenartikel bewusst ohne Rezept zum Selbstzahlerpreis gekauft.
    withoutPrescription: boolean('without_prescription').notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.onboardingSessionId, table.productId] }),
  }),
);

export type OnboardingSessionPositionRow = typeof onboardingSessionPositions.$inferSelect;
export type NewOnboardingSessionPositionRow = typeof onboardingSessionPositions.$inferInsert;
