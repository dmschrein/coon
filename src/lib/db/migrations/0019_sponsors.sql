-- Sponsors: paid sponsorship deals tracked through a 5-stage pipeline.
CREATE TABLE IF NOT EXISTS "sponsors" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "company_name" text NOT NULL,
  "contact_name" text,
  "contact_email" text,
  "deal_value" integer,
  "status" text NOT NULL DEFAULT 'outreach',
  "deliverables" text,
  "start_date" timestamp,
  "end_date" timestamp,
  "notes" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sponsors_user_idx" ON "sponsors" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sponsors_user_status_idx" ON "sponsors" ("user_id", "status");
