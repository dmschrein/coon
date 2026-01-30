import { z } from "zod";

// ============================================================================
// Content Validation Schemas
// ============================================================================

// Shared enum values
const platformValues = [
  "twitter",
  "linkedin",
  "reddit",
  "discord",
  "youtube",
  "tiktok",
  "instagram",
  "threads",
  "hackernews",
  "producthunt",
  "indiehackers",
] as const;

const contentTypeValues = [
  "educational",
  "story",
  "question",
  "poll",
  "behind-the-scenes",
  "tip",
  "thread",
  "comment",
  "resource",
  "case-study",
  "meme",
  "announcement",
] as const;

// ----------------------------------------------------------------------------
// Content Draft Schema
// ----------------------------------------------------------------------------

export const contentDraftSchema = z.object({
  headline: z.string().optional(),
  body: z.string().min(1, "Content body must not be empty"),
  hashtags: z.array(z.string()).optional(),
  cta: z.string().optional(),
});

export type ContentDraftSchema = z.infer<typeof contentDraftSchema>;

// ----------------------------------------------------------------------------
// Content Pillar Schema
// ----------------------------------------------------------------------------

export const contentPillarSchema = z.object({
  theme: z.string(),
  description: z.string(),
  sampleTopics: z.array(z.string()),
  targetedPainPoint: z.string(),
});

export type ContentPillarSchema = z.infer<typeof contentPillarSchema>;

// ----------------------------------------------------------------------------
// Content Strategy Schema
// ----------------------------------------------------------------------------

export const contentStrategySchema = z.object({
  pillars: z
    .array(contentPillarSchema)
    .min(1, "At least one content pillar is required"),
  voiceTone: z.string(),
  contentMix: z.record(z.string(), z.number()),
});

export type ContentStrategySchema = z.infer<typeof contentStrategySchema>;

// ----------------------------------------------------------------------------
// Generated Content Schema
// ----------------------------------------------------------------------------

export const generatedContentSchema = z.object({
  platform: z.enum(platformValues),
  contentType: z.enum(contentTypeValues),
  pillar: z.string(),
  draft: contentDraftSchema,
});

export type GeneratedContentSchema = z.infer<typeof generatedContentSchema>;

// ----------------------------------------------------------------------------
// Content Plan Schema
// ----------------------------------------------------------------------------

export const contentPlanSchema = z.object({
  strategy: contentStrategySchema,
  contentDrafts: z.array(generatedContentSchema),
});

export type ContentPlanSchema = z.infer<typeof contentPlanSchema>;
