import { boolean, integer, jsonb, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { organizations } from './organizations.schema';

export const manufacturers = pgTable('manufacturers', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const catalogCategories = pgTable('catalog_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// CLAUDE.md: Produkt/catalog data is a placeholder for the pilot — never
// hardcode real manufacturer/pricing/Hilfsmittelnummer data as if production.
export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id),
  categoryId: uuid('category_id')
    .notNull()
    .references(() => catalogCategories.id),
  manufacturerId: uuid('manufacturer_id')
    .notNull()
    .references(() => manufacturers.id),
  name: text('name').notNull(),
  hilfsmittelnummer: text('hilfsmittelnummer').notNull(),
  description: text('description').notNull(),
  features: jsonb('features').notNull().default([]),
  requiresApproval: boolean('requires_approval').notNull().default(true),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const suppliers = pgTable('suppliers', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id),
  name: text('name').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  // Placeholder default, same discipline as supplierProducts.deliveryTimeDays
  // below — real per-supplier capacity is pilot-partner data, not yet known.
  dailyCapacity: integer('daily_capacity').notNull().default(5),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// deliveryTimeDays is a structured integer, not the free-text "3–5 Werktage"
// the client parses via regex today (lib/terminplanung.ts) — the API layer
// derives a display string from it instead of storing unparsed text.
export const supplierProducts = pgTable(
  'supplier_products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    supplierId: uuid('supplier_id')
      .notNull()
      .references(() => suppliers.id),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id),
    deliveryTimeDays: integer('delivery_time_days').notNull().default(3),
    customerCopayCents: integer('customer_copay_cents').notNull().default(0),
    availability: text('availability').notNull().default('available'),
    isActive: boolean('is_active').notNull().default(true),
  },
  (table) => ({
    supplierProductUnique: unique().on(table.supplierId, table.productId),
  }),
);

export type Manufacturer = typeof manufacturers.$inferSelect;
export type CatalogCategory = typeof catalogCategories.$inferSelect;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type Supplier = typeof suppliers.$inferSelect;
export type SupplierProduct = typeof supplierProducts.$inferSelect;
export type NewSupplierProduct = typeof supplierProducts.$inferInsert;
