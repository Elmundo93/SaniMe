ALTER TABLE "products" ADD COLUMN "vat_rate_percent" integer DEFAULT 19 NOT NULL;--> statement-breakpoint
ALTER TABLE "supplies" ADD COLUMN "vat_rate_snapshot_percent" integer;