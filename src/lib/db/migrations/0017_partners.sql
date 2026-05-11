-- Cross-community partners: communities the user is partnering with for cross-promo / collabs.
CREATE TABLE IF NOT EXISTS "partners" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "platform" text NOT NULL,
  "url" text,
  "contact_handle" text,
  "status" text NOT NULL DEFAULT 'prospect',
  "collaboration_ideas" text,
  "notes" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "partners_user_idx" ON "partners" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "partners_user_status_idx" ON "partners" ("user_id", "status");
