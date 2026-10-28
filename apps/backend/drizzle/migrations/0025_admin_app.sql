ALTER TABLE "admin_users" ADD COLUMN "name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "admin_users" ADD COLUMN "totp_secret_encrypted" text;--> statement-breakpoint
ALTER TABLE "admin_users" ADD COLUMN "totp_activated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "admin_users" ADD COLUMN "deactivated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "admin_users" ADD COLUMN "last_login_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "open_actions" ADD COLUMN "assigned_admin_id" uuid;--> statement-breakpoint
ALTER TABLE "urgent_delivery_requests" ADD COLUMN "outcome" text;--> statement-breakpoint
ALTER TABLE "open_actions" ADD CONSTRAINT "open_actions_assigned_admin_id_admin_users_id_fk" FOREIGN KEY ("assigned_admin_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;