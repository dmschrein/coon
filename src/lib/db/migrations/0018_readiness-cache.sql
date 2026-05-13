-- Per-user monetization readiness cache. Lives on the users row so each user has at most one cached
-- assessment, refreshed when the agent runs (every 7 days from the route layer).
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "readiness_cache" jsonb;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "readiness_updated_at" timestamp;
