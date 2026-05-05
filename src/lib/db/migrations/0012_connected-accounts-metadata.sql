-- Per-account platform-specific metadata (e.g. Discord serverId/defaultChannelId)
ALTER TABLE "connected_accounts" ADD COLUMN IF NOT EXISTS "metadata" jsonb;
