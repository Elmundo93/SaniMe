CREATE TABLE "consent_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"customer_id" uuid,
	"onboarding_session_id" uuid,
	"agb_version" text NOT NULL,
	"datenschutz_version" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "consent_grants_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "product_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"storage_key" text NOT NULL,
	"alt_text" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_relations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"source_product_id" uuid NOT NULL,
	"target_product_id" uuid NOT NULL,
	"relation_type" text NOT NULL,
	"source_variant_id" uuid,
	CONSTRAINT "product_relations_source_product_id_target_product_id_source_variant_id_unique" UNIQUE NULLS NOT DISTINCT("source_product_id","target_product_id","source_variant_id"),
	CONSTRAINT "product_relations_type_check" CHECK ("product_relations"."relation_type" in ('zubehoer', 'ersatzteil', 'dienstleistung'))
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"sku" text NOT NULL,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qa_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"frage" text NOT NULL,
	"antwort" text NOT NULL,
	"kurzantwort" text,
	"quellen" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"geprueft_am" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "qa_entries_organization_id_slug_unique" UNIQUE("organization_id","slug")
);
--> statement-breakpoint
CREATE TABLE "qa_entry_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"qa_entry_id" uuid NOT NULL,
	"product_id" uuid,
	"category_id" uuid,
	"bedarf_id" text,
	"krankheitsbild_id" text,
	CONSTRAINT "qa_entry_links_genau_ein_ziel" CHECK (num_nonnulls("qa_entry_links"."product_id", "qa_entry_links"."category_id", "qa_entry_links"."bedarf_id", "qa_entry_links"."krankheitsbild_id") = 1)
);
--> statement-breakpoint
ALTER TABLE "consents" ADD COLUMN "uebernommen_von_grant_id" uuid;--> statement-breakpoint
ALTER TABLE "catalog_categories" ADD COLUMN "parent_id" uuid;--> statement-breakpoint
ALTER TABLE "catalog_categories" ADD COLUMN "slug" text;--> statement-breakpoint
-- Bestehende Zeilen bekommen vorübergehend ihre id als slug; der Katalog-Seed
-- setzt per Upsert (gleiche UUID) den echten slug.
UPDATE "catalog_categories" SET "slug" = "id"::text WHERE "slug" IS NULL;--> statement-breakpoint
ALTER TABLE "catalog_categories" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "catalog_categories" ADD COLUMN "beschreibung" text;--> statement-breakpoint
ALTER TABLE "catalog_categories" ADD COLUMN "icon" text;--> statement-breakpoint
ALTER TABLE "catalog_categories" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "catalog_categories" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "kurzbeschreibung" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "artikelnummer" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "attributes" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "consent_grants" ADD CONSTRAINT "consent_grants_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_grants" ADD CONSTRAINT "consent_grants_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_relations" ADD CONSTRAINT "product_relations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_relations" ADD CONSTRAINT "product_relations_source_product_id_products_id_fk" FOREIGN KEY ("source_product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_relations" ADD CONSTRAINT "product_relations_target_product_id_products_id_fk" FOREIGN KEY ("target_product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_relations" ADD CONSTRAINT "product_relations_source_variant_id_product_variants_id_fk" FOREIGN KEY ("source_variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qa_entries" ADD CONSTRAINT "qa_entries_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qa_entry_links" ADD CONSTRAINT "qa_entry_links_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qa_entry_links" ADD CONSTRAINT "qa_entry_links_qa_entry_id_qa_entries_id_fk" FOREIGN KEY ("qa_entry_id") REFERENCES "public"."qa_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qa_entry_links" ADD CONSTRAINT "qa_entry_links_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qa_entry_links" ADD CONSTRAINT "qa_entry_links_category_id_catalog_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."catalog_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consents" ADD CONSTRAINT "consents_uebernommen_von_grant_id_consent_grants_id_fk" FOREIGN KEY ("uebernommen_von_grant_id") REFERENCES "public"."consent_grants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_categories" ADD CONSTRAINT "catalog_categories_parent_id_catalog_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."catalog_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_categories" ADD CONSTRAINT "catalog_categories_organization_id_slug_unique" UNIQUE("organization_id","slug");;--> statement-breakpoint
-- Tippfehler-tolerante Katalogsuche (word_similarity). Die Ausdrücke müssen zu
-- normSql() in products.repository.ts passen, sonst greift der Index nicht.
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_name_trgm_idx" ON "products" USING gin ((replace(replace(replace(replace(lower("name"), 'ä', 'ae'), 'ö', 'oe'), 'ü', 'ue'), 'ß', 'ss')) gin_trgm_ops);