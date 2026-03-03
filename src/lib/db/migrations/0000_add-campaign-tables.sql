CREATE TABLE "agent_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"agent_type" text NOT NULL,
	"input_data" jsonb,
	"output_data" jsonb,
	"model_used" text,
	"tokens_used" integer,
	"duration_ms" integer,
	"status" text,
	"error_message" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audience_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"quiz_response_id" uuid,
	"profile_data" jsonb NOT NULL,
	"is_active" boolean DEFAULT true,
	"generated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "campaign_calendar_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"day_number" integer NOT NULL,
	"scheduled_date" timestamp,
	"platform" text NOT NULL,
	"content_type" text NOT NULL,
	"title" text NOT NULL,
	"posting_time" text,
	"pillar" text,
	"notes" text,
	"campaign_content_id" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "campaign_content" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"platform" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"content_data" jsonb,
	"tokens_used" integer,
	"error_message" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"audience_profile_id" uuid,
	"quiz_response_id" uuid,
	"name" text,
	"status" text DEFAULT 'strategy_pending' NOT NULL,
	"strategy_data" jsonb,
	"calendar_data" jsonb,
	"selected_platforms" text[],
	"completed_platforms" text[] DEFAULT '{}',
	"total_tokens_used" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "content_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"audience_profile_id" uuid,
	"platform" text NOT NULL,
	"content_type" text NOT NULL,
	"pillar" text,
	"title" text,
	"body" text NOT NULL,
	"hashtags" text[],
	"cta" text,
	"status" text DEFAULT 'draft',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "quiz_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"response_data" jsonb NOT NULL,
	"version" integer DEFAULT 1,
	"completed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"onboarding_completed" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audience_profiles" ADD CONSTRAINT "audience_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audience_profiles" ADD CONSTRAINT "audience_profiles_quiz_response_id_quiz_responses_id_fk" FOREIGN KEY ("quiz_response_id") REFERENCES "public"."quiz_responses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_calendar_entries" ADD CONSTRAINT "campaign_calendar_entries_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_calendar_entries" ADD CONSTRAINT "campaign_calendar_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_calendar_entries" ADD CONSTRAINT "campaign_calendar_entries_campaign_content_id_campaign_content_id_fk" FOREIGN KEY ("campaign_content_id") REFERENCES "public"."campaign_content"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_content" ADD CONSTRAINT "campaign_content_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_content" ADD CONSTRAINT "campaign_content_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_audience_profile_id_audience_profiles_id_fk" FOREIGN KEY ("audience_profile_id") REFERENCES "public"."audience_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_quiz_response_id_quiz_responses_id_fk" FOREIGN KEY ("quiz_response_id") REFERENCES "public"."quiz_responses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_audience_profile_id_audience_profiles_id_fk" FOREIGN KEY ("audience_profile_id") REFERENCES "public"."audience_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_responses" ADD CONSTRAINT "quiz_responses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;