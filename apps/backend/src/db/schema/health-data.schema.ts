import { boolean, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { customers } from './customers.schema';
import { documents } from './documents.schema';
import { organizations } from './organizations.schema';

// Polymorphic subject pattern (subjectType/subjectId as plain text, no hard
// FK) — reuses the exact shape Layer 1's consents.schema.ts already
// established, specifically to avoid a circular schema dependency with the
// not-yet-built onboarding_sessions table (Phase 2.6).
//
// Kept as a SEPARATE module/table set from Customer (Principle 11) — every
// read of these tables must go through the access-log-mandatory repository
// layer. In Layer 2 that decorator lives on the two *consuming* Onboarding
// endpoints whose responses actually surface these fields, not here (there
// is no HealthData controller in Layer 2).

export const insurancePolicies = pgTable('insurance_policies', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id),
  subjectType: text('subject_type').notNull(), // 'onboarding_session' | 'customer'
  subjectId: text('subject_id').notNull(),
  customerId: uuid('customer_id').references(() => customers.id), // backfilled at claim time
  insurerName: text('insurer_name').notNull(),
  insurerIk: text('insurer_ik'), // Institutionskennzeichen
  insuredNumber: text('insured_number').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const ocrResults = pgTable('ocr_results', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id),
  subjectType: text('subject_type').notNull(), // 'onboarding_session' | 'customer'
  subjectId: text('subject_id').notNull(),
  documentId: uuid('document_id').references(() => documents.id),
  patientName: text('patient_name').notNull(),
  patientDob: text('patient_dob').notNull(),
  doctorName: text('doctor_name').notNull(),
  doctorLanr: text('doctor_lanr'),
  diagnose: text('diagnose').notNull(),
  hilfsmittel: text('hilfsmittel').notNull(),
  hilfsmittelNr: text('hilfsmittel_nr'),
  datum: text('datum'), // Rezept-Ausstellungsdatum, free-text as OCR'd
  confidence: jsonb('confidence').notNull().default({}),
  rawEdited: boolean('raw_edited').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type InsurancePolicy = typeof insurancePolicies.$inferSelect;
export type NewInsurancePolicy = typeof insurancePolicies.$inferInsert;
export type OcrResultRow = typeof ocrResults.$inferSelect;
export type NewOcrResultRow = typeof ocrResults.$inferInsert;
