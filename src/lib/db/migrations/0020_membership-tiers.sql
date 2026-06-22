-- Membership Tiers: paid subscription tiers with benefits, pricing, and ordering.
CREATE TABLE IF NOT EXISTS "membership_tier" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "tagline" text,
  "description" text,
  "price_cents" integer NOT NULL DEFAULT 0,
  "billing_cycle" text NOT NULL DEFAULT 'monthly',
  "benefits" text[] DEFAULT '{}',
  "external_payment_url" text,
  "member_count" integer NOT NULL DEFAULT 0,
  "is_active" boolean NOT NULL DEFAULT true,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "membership_tier_user_idx" ON "membership_tier" ("user_id");
