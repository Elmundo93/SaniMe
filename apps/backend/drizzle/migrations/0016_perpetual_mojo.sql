ALTER TABLE "products" ALTER COLUMN "hilfsmittelnummer" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "supplies" ALTER COLUMN "hilfsmittel_nr_snapshot" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "onboarding_sessions" ADD COLUMN "preselected_product_id" uuid;--> statement-breakpoint
ALTER TABLE "onboarding_sessions" ADD COLUMN "entry_path" text DEFAULT 'REZEPT' NOT NULL;--> statement-breakpoint
ALTER TABLE "onboarding_sessions" ADD CONSTRAINT "onboarding_sessions_preselected_product_id_products_id_fk" FOREIGN KEY ("preselected_product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;