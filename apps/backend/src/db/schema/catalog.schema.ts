import { sql } from 'drizzle-orm';
import { boolean, check, integer, jsonb, pgTable, text, timestamp, unique, uuid, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { organizations } from './organizations.schema';

export const manufacturers = pgTable('manufacturers', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Zwei Ebenen: parentId null = Hauptkategorie (reine Navigation), sonst
// Unterkategorie — Produkte hängen immer an einer Unterkategorie. Die Tiefe
// erzwingt der Seed/Service, nicht die DB. `slug` ist die stabile Referenz für
// statische Domain-Daten (@sanime/domain's BEDARF_KATALOG.kategorieSlugs,
// KATALOG_FILTER) — UUIDs wären pro Umgebung verschieden.
export const catalogCategories = pgTable(
  'catalog_categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    parentId: uuid('parent_id').references((): AnyPgColumn => catalogCategories.id),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    beschreibung: text('beschreibung'),
    // Feather-Icon-Name, wie Krankheitsbild.icon — zugleich Bild-Platzhalter
    // für Produkte ohne lizenzierte Fotos.
    icon: text('icon'),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    // Verknüpft eine Kategorie mit einer id aus @sanime/domain's statischer
    // KRANKHEITSBILD_KATALOG-Taxonomie — bewusst kein FK auf eine eigene
    // Tabelle, die Taxonomie selbst ist statische Domain-Daten, keine Entität.
    // Darf auf Haupt- oder Unterkategorie stehen; der Lookup löst eine
    // Hauptkategorie auf ihre Kinder auf.
    krankheitsbildId: text('krankheitsbild_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    slugUnique: unique().on(table.organizationId, table.slug),
  }),
);

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
  // Nullable: a Selbstzahler-Artikel (no statutory-insurance billing) has no
  // Hilfsmittelnummer at all — see @sanime/domain's Produkt.hilfsmittelNr and
  // istAbschlussfaehig, which branches the whole onboarding FSM off this.
  hilfsmittelnummer: text('hilfsmittelnummer'),
  description: text('description').notNull(),
  // Ein Satz Nutzen für die Katalogkarte (Fallback: description).
  kurzbeschreibung: text('kurzbeschreibung'),
  // Hersteller-Artikelnummer — nur auf der Detailseite (Progressive Disclosure).
  artikelnummer: text('artikelnummer'),
  // features = Anzeige-Merkmale (Freitext); attributes = strukturiert und
  // filterbar (gewichtKg, faltbar, einsatzort …), validiert gegen
  // @sanime/domain's KATALOG_FILTER.
  features: jsonb('features').notNull().default([]),
  attributes: jsonb('attributes').notNull().default({}),
  requiresApproval: boolean('requires_approval').notNull().default(true),
  // Umsatzsteuersatz in Prozent (19 regulär, 7 nach Anlage 2 UStG, z. B. Rollstühle
  // Nr. 51, Krücken Nr. 52). Die Einstufung je Artikel muss steuerlich geprüft sein.
  vatRatePercent: integer('vat_rate_percent').notNull().default(19),
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
    // Nur Kassenartikel: unser Preis, wenn der Kunde ohne Rezept kauft (selbst
    // zahlt, keine Krankenkasse). null = ohne Rezept nicht erhältlich.
    selfPayPriceCents: integer('self_pay_price_cents'),
    availability: text('availability').notNull().default('available'),
    isActive: boolean('is_active').notNull().default(true),
  },
  (table) => ({
    supplierProductUnique: unique().on(table.supplierId, table.productId),
  }),
);

// Öffentliche Katalogbilder — bewusst NICHT im Bucket des document-Moduls (dort
// liegen Gesundheitsdokumente). storageKey wird über CATALOG_IMAGE_BASE_URL zu
// einer fertigen URL. altText ist Pflicht: kein Bild ohne Beschreibung.
export const productImages = pgTable('product_images', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id),
  storageKey: text('storage_key').notNull(),
  altText: text('alt_text').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Varianten werden (noch) nicht bestellt — Warenkorb-Positionen
// arbeitet auf Produkt-Ebene. Sie dienen der Zubehör-Kompatibilität.
export const productVariants = pgTable('product_variants', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id),
  sku: text('sku').notNull(),
  // Unterscheidende Merkmale der Ausführung, z. B. { sitzbreiteCm: 40 }.
  attributes: jsonb('attributes').notNull().default({}),
  isActive: boolean('is_active').notNull().default(true),
});

// Komplementärketten: Zubehör / Ersatzteile / Dienstleistungen. sourceVariantId
// null = passt zu allen Ausführungen des Quellprodukts.
export const productRelations = pgTable(
  'product_relations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    sourceProductId: uuid('source_product_id')
      .notNull()
      .references(() => products.id),
    targetProductId: uuid('target_product_id')
      .notNull()
      .references(() => products.id),
    relationType: text('relation_type').notNull(), // 'zubehoer' | 'ersatzteil' | 'dienstleistung'
    sourceVariantId: uuid('source_variant_id').references(() => productVariants.id),
  },
  (table) => ({
    relationUnique: unique()
      .on(table.sourceProductId, table.targetProductId, table.sourceVariantId)
      .nullsNotDistinct(),
    relationTypeCheck: check(
      'product_relations_type_check',
      sql`${table.relationType} in ('zubehoer', 'ersatzteil', 'dienstleistung')`,
    ),
  }),
);

// Kuratierte Q&A-Bibliothek („Ratgeber“) — redaktioneller, öffentlicher
// Katalog-Inhalt wie Produkte: keine Nutzereingaben, keine personenbezogenen
// Daten. Antworten in eigenen Worten, Quellen sichtbar, geprueftAm zeigt die
// letzte redaktionelle Prüfung (Kassenregeln ändern sich).
export const qaEntries = pgTable(
  'qa_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    slug: text('slug').notNull(),
    frage: text('frage').notNull(),
    // Einfaches Markdown: Absätze und „- “-Listen, sonst nichts.
    antwort: text('antwort').notNull(),
    kurzantwort: text('kurzantwort'),
    quellen: jsonb('quellen').notNull().default([]),
    sortOrder: integer('sort_order').notNull().default(0),
    isPublished: boolean('is_published').notNull().default(true),
    geprueftAm: timestamp('geprueft_am', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    slugUnique: unique().on(table.organizationId, table.slug),
  }),
);

// n:m, genau ein Ziel pro Zeile. Ein Kategorie-Link gilt für alle Produkte der
// Kategorie (inkl. Kinder) — „Zahlt die Kasse einen Rollator?“ hängt einmal an
// „Rollatoren“ statt an jedem Rollator. bedarfId/krankheitsbildId sind wie
// catalog_categories.krankheitsbild_id bewusst kein FK (statische Domain-Daten).
export const qaEntryLinks = pgTable(
  'qa_entry_links',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    qaEntryId: uuid('qa_entry_id')
      .notNull()
      .references(() => qaEntries.id),
    productId: uuid('product_id').references(() => products.id),
    categoryId: uuid('category_id').references(() => catalogCategories.id),
    bedarfId: text('bedarf_id'),
    krankheitsbildId: text('krankheitsbild_id'),
  },
  (table) => ({
    genauEinZiel: check(
      'qa_entry_links_genau_ein_ziel',
      sql`num_nonnulls(${table.productId}, ${table.categoryId}, ${table.bedarfId}, ${table.krankheitsbildId}) = 1`,
    ),
  }),
);

export type Manufacturer = typeof manufacturers.$inferSelect;
export type CatalogCategory = typeof catalogCategories.$inferSelect;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type Supplier = typeof suppliers.$inferSelect;
export type SupplierProduct = typeof supplierProducts.$inferSelect;
export type NewSupplierProduct = typeof supplierProducts.$inferInsert;
export type ProductImage = typeof productImages.$inferSelect;
export type ProductVariant = typeof productVariants.$inferSelect;
export type ProductRelation = typeof productRelations.$inferSelect;
export type QaEntry = typeof qaEntries.$inferSelect;
export type QaEntryLink = typeof qaEntryLinks.$inferSelect;
