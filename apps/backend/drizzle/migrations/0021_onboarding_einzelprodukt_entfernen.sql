ALTER TABLE "onboarding_sessions" DROP CONSTRAINT "onboarding_sessions_selected_product_id_products_id_fk";
--> statement-breakpoint
ALTER TABLE "onboarding_sessions" DROP CONSTRAINT "onboarding_sessions_selected_supplier_product_id_supplier_products_id_fk";
--> statement-breakpoint
ALTER TABLE "onboarding_sessions" DROP CONSTRAINT "onboarding_sessions_preselected_product_id_products_id_fk";
--> statement-breakpoint
ALTER TABLE "onboarding_sessions" DROP COLUMN "selected_product_id";--> statement-breakpoint
ALTER TABLE "onboarding_sessions" DROP COLUMN "selected_supplier_product_id";--> statement-breakpoint
ALTER TABLE "onboarding_sessions" DROP COLUMN "preselected_product_id";--> statement-breakpoint
ALTER TABLE "onboarding_sessions" DROP COLUMN "entry_path";--> statement-breakpoint
ALTER TABLE "onboarding_sessions" DROP COLUMN "selected_krankheitsbild_id";