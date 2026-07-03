import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { suppliers } from './catalog.schema';
import { customerAddresses } from './customers.schema';
import { organizations } from './organizations.schema';
import { orders, supplies } from './supply-order.schema';

// No 'proposed' status — proposeSlots() is a pure read, never persisted.
// Only book() inserts a row, always 'confirmed'. Capacity counting
// (SupplierCalendarService) only ever counts these rows, never candidates —
// see packages/@sanime/domain/calendar.ts + work/Backendsprint.md Layer 3.
export const appointments = pgTable('appointments', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id),
  supplyId: uuid('supply_id')
    .notNull()
    .references(() => supplies.id),
  orderId: uuid('order_id')
    .notNull()
    .references(() => orders.id),
  supplierId: uuid('supplier_id')
    .notNull()
    .references(() => suppliers.id),
  scheduledStart: timestamp('scheduled_start', { withTimezone: true }).notNull(),
  scheduledEnd: timestamp('scheduled_end', { withTimezone: true }).notNull(),
  addressId: uuid('address_id').references(() => customerAddresses.id),
  status: text('status').notNull().default('confirmed'), // 'confirmed' | 'cancelled' | 'completed'
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Appointment = typeof appointments.$inferSelect;
export type NewAppointment = typeof appointments.$inferInsert;
