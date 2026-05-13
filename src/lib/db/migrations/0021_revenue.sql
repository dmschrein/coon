-- Revenue Entries: individual revenue records (sponsorships, memberships, courses, events, other).
CREATE TABLE IF NOT EXISTS "revenue_entry" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "date" date NOT NULL,
  "source" text,
  "type" text NOT NULL,
  "amount_cents" integer NOT NULL,
  "notes" text,
  "created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "revenue_entry_user_idx" ON "revenue_entry" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "revenue_entry_user_date_idx" ON "revenue_entry" ("user_id", "date");
