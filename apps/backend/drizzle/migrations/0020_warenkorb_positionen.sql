CREATE TABLE "onboarding_session_positions" (
	"onboarding_session_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"supplier_product_id" uuid,
	"ocr_result_id" uuid,
	"krankheitsbild_id" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "onboarding_session_positions_onboarding_session_id_product_id_pk" PRIMARY KEY("onboarding_session_id","product_id")
);
--> statement-breakpoint
ALTER TABLE "onboarding_sessions" ADD COLUMN "active_position_product_id" uuid;--> statement-breakpoint
ALTER TABLE "onboarding_session_positions" ADD CONSTRAINT "onboarding_session_positions_onboarding_session_id_onboarding_sessions_id_fk" FOREIGN KEY ("onboarding_session_id") REFERENCES "public"."onboarding_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_session_positions" ADD CONSTRAINT "onboarding_session_positions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_session_positions" ADD CONSTRAINT "onboarding_session_positions_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_session_positions" ADD CONSTRAINT "onboarding_session_positions_supplier_product_id_supplier_products_id_fk" FOREIGN KEY ("supplier_product_id") REFERENCES "public"."supplier_products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_session_positions" ADD CONSTRAINT "onboarding_session_positions_ocr_result_id_ocr_results_id_fk" FOREIGN KEY ("ocr_result_id") REFERENCES "public"."ocr_results"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_sessions" ADD CONSTRAINT "onboarding_sessions_active_position_product_id_products_id_fk" FOREIGN KEY ("active_position_product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Warenkorb: das bisher einzelne gewählte Produkt einer Session wird zur
-- ersten Position, mit dem Rezept der Session (Kassenartikel) bzw. ohne
-- (Selbstzahler). ZUSAMMENFASSUNG entfällt — ihr Inhalt ist jetzt die
-- Übersicht im Checkout.
INSERT INTO "onboarding_session_positions"
  ("onboarding_session_id", "organization_id", "product_id", "supplier_product_id", "ocr_result_id", "krankheitsbild_id")
  SELECT s."id", s."organization_id", s."selected_product_id", s."selected_supplier_product_id",
         CASE WHEN p."hilfsmittelnummer" IS NOT NULL THEN s."ocr_result_id" END,
         s."selected_krankheitsbild_id"
  FROM "onboarding_sessions" s
  JOIN "products" p ON p."id" = s."selected_product_id";--> statement-breakpoint
-- Ab TERMINPLANUNG gehört das Rezept nur noch der Position; der Scan-
-- Zwischenstand der Session wird geleert. Frühere Status (Zurück-Navigation
-- nach einer Wahl) behalten ihn, damit die Versorgungsauswahl weiter klappt.
UPDATE "onboarding_sessions" SET "ocr_result_id" = NULL
  WHERE "selected_product_id" IS NOT NULL
    AND "status" IN ('TERMINPLANUNG', 'ZUSAMMENFASSUNG', 'CHECKOUT', 'CHECKOUT_FEHLGESCHLAGEN');--> statement-breakpoint
UPDATE "onboarding_sessions" SET "status" = 'CHECKOUT' WHERE "status" = 'ZUSAMMENFASSUNG';
