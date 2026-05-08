-- Outreach prospects: people the user wants to contact pre-launch.
CREATE TABLE IF NOT EXISTS "outreach_prospect" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "handle" text NOT NULL,
  "platform" text NOT NULL,
  "source" text,
  "status" text NOT NULL DEFAULT 'cold',
  "notes" text,
  "tags" text[] DEFAULT '{}',
  "last_contacted_at" timestamp,
  "contacted_count" integer DEFAULT 0,
  "converted_from_content_id" uuid REFERENCES "campaign_content"("id"),
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  CONSTRAINT "outreach_prospect_user_platform_handle_unique" UNIQUE ("user_id", "platform", "handle")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "outreach_prospect_user_idx" ON "outreach_prospect" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "outreach_prospect_user_status_idx" ON "outreach_prospect" ("user_id", "status");
