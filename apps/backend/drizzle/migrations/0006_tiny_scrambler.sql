CREATE TABLE "onboarding_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"session_secret_hash" text NOT NULL,
	"status" text DEFAULT 'WILLKOMMEN' NOT NULL,
	"customer_id" uuid,
	"prescription_document_id" uuid,
	"insurance_card_document_id" uuid,
	"insurance_card_skipped" boolean DEFAULT false NOT NULL,
	"ocr_result_id" uuid,
	"selected_product_id" uuid,
	"selected_supplier_product_id" uuid,
	"available_product_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"appointment_slots_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"selected_appointment_json" jsonb,
	"binding_confirmation" boolean DEFAULT false NOT NULL,
	"contact_email" text,
	"contact_phone" text,
	"contact_phone_verified" boolean DEFAULT false NOT NULL,
	"supply_id" uuid,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "onboarding_sessions_session_secret_hash_unique" UNIQUE("session_secret_hash")
);
--> statement-breakpoint
CREATE TABLE "verification_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"target" text NOT NULL,
	"purpose" text NOT NULL,
	"code_hmac" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "consents" ADD COLUMN "ip_address" text;--> statement-breakpoint
ALTER TABLE "ocr_results" ADD COLUMN "datum" text;--> statement-breakpoint
ALTER TABLE "onboarding_sessions" ADD CONSTRAINT "onboarding_sessions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_sessions" ADD CONSTRAINT "onboarding_sessions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_sessions" ADD CONSTRAINT "onboarding_sessions_prescription_document_id_documents_id_fk" FOREIGN KEY ("prescription_document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_sessions" ADD CONSTRAINT "onboarding_sessions_insurance_card_document_id_documents_id_fk" FOREIGN KEY ("insurance_card_document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_sessions" ADD CONSTRAINT "onboarding_sessions_ocr_result_id_ocr_results_id_fk" FOREIGN KEY ("ocr_result_id") REFERENCES "public"."ocr_results"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_sessions" ADD CONSTRAINT "onboarding_sessions_selected_product_id_products_id_fk" FOREIGN KEY ("selected_product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_sessions" ADD CONSTRAINT "onboarding_sessions_selected_supplier_product_id_supplier_products_id_fk" FOREIGN KEY ("selected_supplier_product_id") REFERENCES "public"."supplier_products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_sessions" ADD CONSTRAINT "onboarding_sessions_supply_id_supplies_id_fk" FOREIGN KEY ("supply_id") REFERENCES "public"."supplies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Hand-added: supplies.onboarding_session_id -> onboarding_sessions.id.
-- Not expressed in supply-order.schema.ts's TS definition (Drizzle's lazy
-- .references() callback resolves the circular *runtime* import fine, but
-- tsc can't resolve the resulting circular pgTable() return type — see the
-- comment in supply-order.schema.ts). A normal safe Postgres ALTER, added
-- once onboarding_sessions exists.
ALTER TABLE "supplies" ADD CONSTRAINT "supplies_onboarding_session_id_onboarding_sessions_id_fk" FOREIGN KEY ("onboarding_session_id") REFERENCES "public"."onboarding_sessions"("id") ON DELETE no action ON UPDATE no action;