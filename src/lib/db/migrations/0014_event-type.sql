-- Event content type: tag rows in campaign_content as 'event' and store event-specific metadata.
ALTER TABLE "campaign_content" ADD COLUMN IF NOT EXISTS "content_type" text DEFAULT 'post';
--> statement-breakpoint
ALTER TABLE "campaign_content" ADD COLUMN IF NOT EXISTS "event_title" text;
--> statement-breakpoint
ALTER TABLE "campaign_content" ADD COLUMN IF NOT EXISTS "event_datetime" timestamp;
--> statement-breakpoint
ALTER TABLE "campaign_content" ADD COLUMN IF NOT EXISTS "event_rsvp_url" text;
