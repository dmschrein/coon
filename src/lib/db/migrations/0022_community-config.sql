-- Add per-user community configuration (manifesto, setup guides, onboarding, rules)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "community_config" jsonb;
