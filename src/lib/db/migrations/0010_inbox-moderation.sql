-- Inbox moderation flag fields
ALTER TABLE "inbox_items" ADD COLUMN IF NOT EXISTS "flagged" boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE "inbox_items" ADD COLUMN IF NOT EXISTS "flag_reason" text;
--> statement-breakpoint
ALTER TABLE "inbox_items" ADD COLUMN IF NOT EXISTS "flag_category" text;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inbox_items_user_flagged_idx" ON "inbox_items" ("user_id", "flagged");
