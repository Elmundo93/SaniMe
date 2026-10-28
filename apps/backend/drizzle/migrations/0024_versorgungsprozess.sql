CREATE TABLE "urgent_delivery_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supply_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"availability" text NOT NULL,
	"phone" text,
	"open_action_id" uuid,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"token" text NOT NULL,
	"platform" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "open_actions" ADD COLUMN "audience" text DEFAULT 'intern' NOT NULL;--> statement-breakpoint
ALTER TABLE "supplies" ADD COLUMN "insurance_submitted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "supplies" ADD COLUMN "insurance_decided_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "onboarding_sessions" ADD COLUMN "notfall_json" jsonb;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "data" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "urgent_delivery_requests" ADD CONSTRAINT "urgent_delivery_requests_supply_id_supplies_id_fk" FOREIGN KEY ("supply_id") REFERENCES "public"."supplies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "urgent_delivery_requests" ADD CONSTRAINT "urgent_delivery_requests_open_action_id_open_actions_id_fk" FOREIGN KEY ("open_action_id") REFERENCES "public"."open_actions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;