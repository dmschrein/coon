-- Post Engagement table
CREATE TABLE IF NOT EXISTS "post_engagement" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "campaign_content_id" uuid NOT NULL REFERENCES "campaign_content"("id") ON DELETE CASCADE,
  "platform" text NOT NULL,
  "platform_post_id" text NOT NULL,
  "likes" integer DEFAULT 0,
  "comments" integer DEFAULT 0,
  "shares" integer DEFAULT 0,
  "reach" integer DEFAULT 0,
  "impressions" integer DEFAULT 0,
  "engagement_rate" text,
  "recorded_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "post_engagement_content_idx" ON "post_engagement" ("campaign_content_id");

-- Platform Members table
CREATE TABLE IF NOT EXISTS "platform_members" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "platform" text NOT NULL,
  "platform_user_id" text NOT NULL,
  "username" text NOT NULL,
  "display_name" text,
  "first_seen_at" timestamp DEFAULT now(),
  "engagement_count" integer DEFAULT 0,
  "last_seen_at" timestamp DEFAULT now(),
  UNIQUE ("user_id", "platform", "platform_user_id")
);

CREATE INDEX IF NOT EXISTS "platform_members_user_idx" ON "platform_members" ("user_id");
