ALTER TABLE "supplies" ADD COLUMN "product_variant_id" uuid;--> statement-breakpoint
ALTER TABLE "supplies" ADD COLUMN "variant_label_snapshot" text;--> statement-breakpoint
ALTER TABLE "onboarding_session_positions" ADD COLUMN "product_variant_id" uuid;--> statement-breakpoint
ALTER TABLE "supplies" ADD CONSTRAINT "supplies_product_variant_id_product_variants_id_fk" FOREIGN KEY ("product_variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_session_positions" ADD CONSTRAINT "onboarding_session_positions_product_variant_id_product_variants_id_fk" FOREIGN KEY ("product_variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;