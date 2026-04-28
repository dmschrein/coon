-- Inbox Items table
CREATE TABLE IF NOT EXISTS "inbox_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "campaign_id" uuid REFERENCES "campaigns"("id"),
  "content_id" uuid REFERENCES "campaign_content"("id"),
  "platform" text NOT NULL,
  "author_handle" text NOT NULL,
  "author_display_name" text,
  "message_text" text NOT NULL,
  "message_type" text NOT NULL,
  "status" text NOT NULL DEFAULT 'unread',
  "platform_message_id" text NOT NULL,
  "received_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inbox_items_user_status_idx" ON "inbox_items" ("user_id", "status");
