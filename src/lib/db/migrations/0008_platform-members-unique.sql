-- Dedupe any existing duplicate platform_members rows (keep the one most recently seen)
DELETE FROM "platform_members" a
USING "platform_members" b
WHERE
  a."id" <> b."id"
  AND a."user_id" = b."user_id"
  AND a."platform" = b."platform"
  AND a."platform_user_id" = b."platform_user_id"
  AND (
    a."last_seen_at" < b."last_seen_at"
    OR (a."last_seen_at" = b."last_seen_at" AND a."id" < b."id")
  );

-- Add unique constraint required by the upsert path
ALTER TABLE "platform_members"
  ADD CONSTRAINT "platform_members_user_platform_userid_unique"
  UNIQUE ("user_id", "platform", "platform_user_id");
