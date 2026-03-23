ALTER TABLE "audience_profiles" ADD COLUMN "confidence_level" text DEFAULT 'quiz_based';--> statement-breakpoint
ALTER TABLE "audience_profiles" ADD COLUMN "analytics_data" jsonb;