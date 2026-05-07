-- Workflow triggers: user-defined rules that fire actions on member events.
CREATE TABLE IF NOT EXISTS "workflow_triggers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "event_type" text NOT NULL,
  "conditions" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "actions" jsonb NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workflow_triggers_user_event_active_idx"
  ON "workflow_triggers" ("user_id", "event_type", "is_active");
--> statement-breakpoint
ALTER TABLE "platform_members" ADD COLUMN IF NOT EXISTS "last_inactive_fired_at" timestamp;
