-- Add CRM columns to platform_members table
ALTER TABLE "platform_members" ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'prospect';
ALTER TABLE "platform_members" ADD COLUMN IF NOT EXISTS "tags" text[] DEFAULT '{}';
ALTER TABLE "platform_members" ADD COLUMN IF NOT EXISTS "notes" text;
