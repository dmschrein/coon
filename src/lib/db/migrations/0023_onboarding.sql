-- Onboarding Sequences: a 5-step new-member onboarding flow per user.
CREATE TABLE IF NOT EXISTS "onboarding_sequence" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" text NOT NULL DEFAULT 'New Member Onboarding',
  "is_active" boolean NOT NULL DEFAULT false,
  "created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "onboarding_sequence_user_idx" ON "onboarding_sequence" ("user_id");
--> statement-breakpoint
-- Onboarding Steps: the individual messages, one per trigger timing.
CREATE TABLE IF NOT EXISTS "onboarding_step" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "sequence_id" uuid NOT NULL REFERENCES "onboarding_sequence"("id") ON DELETE CASCADE,
  "step_number" integer NOT NULL,
  "trigger_timing" text NOT NULL,
  "channel" text NOT NULL DEFAULT 'email',
  "subject" text,
  "content" text NOT NULL,
  "created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "onboarding_step_sequence_idx" ON "onboarding_step" ("sequence_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "onboarding_step_sequence_stepnum_unique" ON "onboarding_step" ("sequence_id", "step_number");
--> statement-breakpoint
-- Onboarding entries reuse the calendar table; they are not campaign-scoped.
ALTER TABLE "campaign_calendar_entries" ALTER COLUMN "campaign_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "campaign_calendar_entries" ADD COLUMN IF NOT EXISTS "onboarding_step_id" uuid REFERENCES "onboarding_step"("id") ON DELETE CASCADE;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "calendar_entries_onboarding_idx" ON "campaign_calendar_entries" ("onboarding_step_id");
