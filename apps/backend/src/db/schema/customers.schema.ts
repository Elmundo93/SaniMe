import { boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { organizations } from './organizations.schema';

export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email'),
  phone: text('phone'),
  // Normalized `.trim().toUpperCase()` at write time — exactly matching
  // today's client-side sucheKundeImArchiv matching rule (lib/mockKundenArchiv.ts).
  insuredNumber: text('insured_number').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Kept separate from `customers` so the lean, widely-FK'd core table stays
// stable while softer/mutable profile fields evolve independently.
export const customerProfiles = pgTable('customer_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id')
    .notNull()
    .unique()
    .references(() => customers.id),
  dateOfBirth: text('date_of_birth'),
  notes: text('notes'),
});

export const customerAddresses = pgTable('customer_addresses', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => customers.id),
  label: text('label').notNull().default('Standard'),
  strasse: text('strasse').notNull(),
  plz: text('plz').notNull(),
  ort: text('ort').notNull(),
  isDefault: boolean('is_default').notNull().default(true),
});

export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
export type CustomerProfile = typeof customerProfiles.$inferSelect;
export type CustomerAddress = typeof customerAddresses.$inferSelect;
export type NewCustomerAddress = typeof customerAddresses.$inferInsert;
