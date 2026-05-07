-- Ritual templates: built-in templates (user_id NULL) + per-user activations
CREATE TABLE IF NOT EXISTS "ritual_templates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text REFERENCES "users"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "description" text,
  "platform" text NOT NULL,
  "prompt_template" text NOT NULL,
  "recurrence" text NOT NULL,
  "day_of_week" integer,
  "is_active" boolean NOT NULL DEFAULT false,
  "source_template_id" uuid,
  "created_at" timestamp NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ritual_templates_user_idx" ON "ritual_templates" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ritual_templates_user_active_idx" ON "ritual_templates" ("user_id", "is_active");
--> statement-breakpoint
ALTER TABLE "campaign_calendar_entries"
  ADD COLUMN IF NOT EXISTS "ritual_template_id" uuid
  REFERENCES "ritual_templates"("id") ON DELETE SET NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "calendar_entries_ritual_idx" ON "campaign_calendar_entries" ("ritual_template_id");
--> statement-breakpoint
INSERT INTO "ritual_templates" (name, description, platform, prompt_template, recurrence, day_of_week) VALUES
  ('Monday Wins', 'Celebrate a community win to start the week.', 'twitter', 'Write a Monday celebration post highlighting a recent win from {{audience}}. Tone: warm, energizing.', 'weekly', 1),
  ('Weekly Hot Take', 'A bold opinion that sparks discussion.', 'twitter', 'Write a contrarian-but-defensible hot take for {{audience}} about {{pillar}}. End with a question.', 'weekly', 2),
  ('Wednesday AMA', 'Open Q&A thread to drive replies.', 'twitter', 'Open an AMA thread inviting {{audience}} to ask anything about {{pillar}}. Pin one curiosity-driving seed question.', 'weekly', 3),
  ('Tool Recommendation Thursday', 'Share a tool the audience should know.', 'linkedin', 'Recommend one tool relevant to {{audience}} working on {{pillar}}. 3 sentences: what it is, why it helps, when to use it.', 'weekly', 4),
  ('Friday Resource Drop', 'Curated resource bundle.', 'linkedin', 'Share 3 high-quality resources (articles/videos/threads) for {{audience}} on {{pillar}}. One-line summary each.', 'weekly', 5),
  ('Beginner Question Friday', 'Welcome newcomers with a beginner-friendly Q.', 'twitter', 'Post a beginner-friendly question on {{pillar}} aimed at newcomers in {{audience}}. Encourage replies of any level.', 'weekly', 5),
  ('Community Spotlight', 'Spotlight a community member every two weeks.', 'instagram', 'Spotlight one member of {{audience}}: hook + 2 sentences on why they matter + a tag.', 'biweekly', 3),
  ('Monthly Challenge', 'A 30-day challenge to drive engagement.', 'linkedin', 'Announce a 30-day challenge for {{audience}} tied to {{pillar}}. State the goal, the daily ask, and how to participate.', 'monthly', NULL);
