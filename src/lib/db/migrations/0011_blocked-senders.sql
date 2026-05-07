-- Blocked senders table — used by inbox moderation block_sender action
CREATE TABLE IF NOT EXISTS "blocked_senders" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "platform" text NOT NULL,
  "handle" text NOT NULL,
  "blocked_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "blocked_senders_user_platform_handle_unique" UNIQUE ("user_id", "platform", "handle")
);
