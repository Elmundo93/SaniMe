import { boolean, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { customerAddresses } from './customers.schema';
import { products, supplierProducts } from './catalog.schema';
import { ocrResults } from './health-data.schema';
import { organizations } from './organizations.schema';
import { customers } from './customers.schema';

// onboarding_sessions.supplyId also FKs back to this table — a genuine
// mutual reference between the two schema files. Drizzle's lazy
// `.references(() => ...)` callback resolves circular *runtime* imports,
// but TypeScript's own type inference still can't resolve the resulting
// circular type (`pgTable()`'s return type would depend on itself) —
// confirmed by trying it: `tsc` fails with "implicitly has type 'any'
// because it is referenced in its own initializer" on both sides. So the FK
// constraint is added via a plain SQL ALTER in the Phase 2.6 migration
// instead (see drizzle/migrations) once onboarding_sessions exists — a
// normal safe Drizzle/Postgres sequencing step, not a shortcut.
export const supplies = pgTable('supplies', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id),
  onboardingSessionId: uuid('onboarding_session_id').notNull(),
  customerId: uuid('customer_id').references(() => customers.id),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id),
  supplierProductId: uuid('supplier_product_id').references(() => supplierProducts.id),
  ocrResultId: uuid('ocr_result_id').references(() => ocrResults.id),
  productNameSnapshot: text('product_name_snapshot').notNull(),
  manufacturerNameSnapshot: text('manufacturer_name_snapshot').notNull(),
  hilfsmittelNrSnapshot: text('hilfsmittel_nr_snapshot').notNull(),
  customerCopaySnapshotCents: integer('customer_copay_snapshot_cents').notNull().default(0),
  deliveryTimeLabelSnapshot: text('delivery_time_label_snapshot').notNull(),
  status: text('status').notNull().default('draft'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id),
  supplyId: uuid('supply_id')
    .notNull()
    .references(() => supplies.id),
  status: text('status').notNull().default('draft'), // mirrors supply.status for query convenience; supply is authoritative
  deliveryAddressId: uuid('delivery_address_id').references(() => customerAddresses.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const orderStatusEvents = pgTable('order_status_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id')
    .notNull()
    .references(() => orders.id),
  fromStatus: text('from_status').notNull(),
  toStatus: text('to_status').notNull(),
  eventType: text('event_type').notNull(), // the domain event name, e.g. 'SupplyCreated'
  actorType: text('actor_type').notNull(), // 'customer' | 'admin' | 'system'
  actorId: text('actor_id'),
  metadata: jsonb('metadata').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// occurredAt null means "pending" — cleaner than the client's current
// `zeitpunkt: ''` string sentinel (store/versorgungStore.ts).
export const timelineEvents = pgTable('timeline_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  supplyId: uuid('supply_id')
    .notNull()
    .references(() => supplies.id),
  label: text('label').notNull(),
  description: text('description').notNull(),
  occurredAt: timestamp('occurred_at', { withTimezone: true }),
  completed: boolean('completed').notNull().default(false),
  // DB-level default means the existing SupplyOrderService.applyTransition
  // call site (TimelineEventsRepository.create) needs zero code changes and
  // keeps inserting 'system' rows automatically. Admin's manual entries go
  // through the sibling createAdminEntry(), which sets 'admin' explicitly.
  source: text('source').notNull().default('system'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const openActions = pgTable('open_actions', {
  id: uuid('id').primaryKey().defaultRandom(),
  supplyId: uuid('supply_id')
    .notNull()
    .references(() => supplies.id),
  title: text('title').notNull(),
  description: text('description').notNull(),
  actionType: text('action_type').notNull(), // 'kamera' | 'formular' | 'info' — matches client's OffeneAktion.typ
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Supply = typeof supplies.$inferSelect;
export type NewSupply = typeof supplies.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderStatusEvent = typeof orderStatusEvents.$inferSelect;
export type TimelineEventRow = typeof timelineEvents.$inferSelect;
export type OpenActionRow = typeof openActions.$inferSelect;
