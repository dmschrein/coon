CREATE TABLE "campaign_analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"total_reach" integer DEFAULT 0,
	"total_engagements" integer DEFAULT 0,
	"total_impressions" integer DEFAULT 0,
	"engagement_rate" text,
	"follower_growth" integer DEFAULT 0,
	"platform_breakdown" jsonb,
	"pillar_breakdown" jsonb,
	"ai_insights" jsonb,
	"ai_recommendations" jsonb,
	"snapshot_date" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "connected_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"platform" text NOT NULL,
	"access_token_encrypted" text NOT NULL,
	"refresh_token_encrypted" text,
	"token_expires_at" timestamp,
	"account_name" text,
	"account_id" text,
	"is_active" boolean DEFAULT true,
	"scopes" text[],
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "content_analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_content_id" uuid NOT NULL,
	"campaign_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"platform" text NOT NULL,
	"reach" integer DEFAULT 0,
	"impressions" integer DEFAULT 0,
	"likes" integer DEFAULT 0,
	"comments" integer DEFAULT 0,
	"shares" integer DEFAULT 0,
	"clicks" integer DEFAULT 0,
	"saves" integer DEFAULT 0,
	"engagement_rate" text,
	"raw_metrics" jsonb,
	"fetched_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "campaigns" ALTER COLUMN "status" SET DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE "campaign_content" ADD COLUMN "pillar" text;--> statement-breakpoint
ALTER TABLE "campaign_content" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "campaign_content" ADD COLUMN "body" text;--> statement-breakpoint
ALTER TABLE "campaign_content" ADD COLUMN "hashtags" text[];--> statement-breakpoint
ALTER TABLE "campaign_content" ADD COLUMN "media_suggestions" jsonb;--> statement-breakpoint
ALTER TABLE "campaign_content" ADD COLUMN "target_community" text;--> statement-breakpoint
ALTER TABLE "campaign_content" ADD COLUMN "scheduled_for" timestamp;--> statement-breakpoint
ALTER TABLE "campaign_content" ADD COLUMN "posted_at" timestamp;--> statement-breakpoint
ALTER TABLE "campaign_content" ADD COLUMN "ai_confidence_score" integer;--> statement-breakpoint
ALTER TABLE "campaign_content" ADD COLUMN "external_post_id" text;--> statement-breakpoint
ALTER TABLE "campaign_content" ADD COLUMN "external_post_url" text;--> statement-breakpoint
ALTER TABLE "campaign_content" ADD COLUMN "approval_status" text DEFAULT 'pending_review';--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "goal" text;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "topic" text;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "duration" text;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "frequency_config" jsonb;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "strategy_summary" text;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "content_pillars" jsonb;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "cohesion_result" jsonb;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "cohesion_content_hash" text;--> statement-breakpoint
ALTER TABLE "campaign_analytics" ADD CONSTRAINT "campaign_analytics_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_analytics" ADD CONSTRAINT "campaign_analytics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connected_accounts" ADD CONSTRAINT "connected_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_analytics" ADD CONSTRAINT "content_analytics_campaign_content_id_campaign_content_id_fk" FOREIGN KEY ("campaign_content_id") REFERENCES "public"."campaign_content"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_analytics" ADD CONSTRAINT "content_analytics_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_analytics" ADD CONSTRAINT "content_analytics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "campaign_content_campaign_idx" ON "campaign_content" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "campaign_content_campaign_status_idx" ON "campaign_content" USING btree ("campaign_id","status");--> statement-breakpoint
CREATE INDEX "campaign_content_scheduled_idx" ON "campaign_content" USING btree ("scheduled_for");--> statement-breakpoint
CREATE INDEX "campaigns_user_status_idx" ON "campaigns" USING btree ("user_id","status");