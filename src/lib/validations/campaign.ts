import { z } from "zod";

// ============================================================================
// Campaign Validation Schemas
// ============================================================================

// --- Campaign Creator ---

export const campaignGoalValues = [
  "build-awareness",
  "drive-engagement",
  "generate-leads",
  "promote-product",
  "educate",
] as const;

export const campaignDurationValues = [
  "1-week",
  "2-weeks",
  "1-month",
  "ongoing",
] as const;

export const campaignCreatorSchema = z.object({
  name: z.string().min(1, "Campaign name is required").max(100),
  goal: z.enum(campaignGoalValues),
  topic: z.string().min(1, "Topic is required").max(500),
  platforms: z.array(z.string()).min(1, "Select at least one platform"),
  duration: z.enum(campaignDurationValues),
  frequencyConfig: z.record(z.string(), z.number().int().min(1).max(14)),
});

export type CampaignCreatorFormData = z.infer<typeof campaignCreatorSchema>;

export const campaignUpdateSchema = campaignCreatorSchema.partial();

export type CampaignUpdateData = z.infer<typeof campaignUpdateSchema>;

// --- Campaign Platforms ---

export const campaignPlatformValues = [
  "blog",
  "instagram",
  "tiktok",
  "twitter",
  "pinterest",
  "youtube",
  "linkedin",
  "reddit",
  "discord",
  "threads",
  "email",
] as const;

export const campaignPlatformSchema = z.enum(campaignPlatformValues);

// ----------------------------------------------------------------------------
// Campaign Strategy Schemas
// ----------------------------------------------------------------------------

export const messagingFrameworkSchema = z.object({
  coreMessage: z.string().min(1),
  supportingMessages: z.array(z.string()).min(1),
  toneGuidelines: z.string(),
  keyPhrases: z.array(z.string()),
  avoidPhrases: z.array(z.string()),
});

export const platformAllocationSchema = z.object({
  platform: campaignPlatformSchema,
  role: z.string(),
  contentFocus: z.string(),
  frequencySuggestion: z.string(),
  priorityOrder: z.number().int().positive(),
});

export const campaignStrategySchema = z.object({
  campaignName: z.string().min(1),
  theme: z.string().min(1),
  goal: z.string().min(1),
  targetOutcome: z.string(),
  timelineWeeks: z.number().int().positive(),
  messagingFramework: messagingFrameworkSchema,
  platformAllocations: z.array(platformAllocationSchema).min(1),
  contentPillars: z
    .array(
      z.object({
        theme: z.string(),
        description: z.string(),
        sampleTopics: z.array(z.string()),
        targetedPainPoint: z.string(),
      })
    )
    .min(1),
  audienceHooks: z.array(z.string()),
});

// ----------------------------------------------------------------------------
// Platform-Specific Content Schemas
// ----------------------------------------------------------------------------

export const blogContentSchema = z.object({
  title: z.string(),
  metaDescription: z.string(),
  keywords: z.array(z.string()),
  headers: z.array(z.object({ level: z.number(), text: z.string() })),
  bodyMarkdown: z.string().min(1),
  internalLinkingSuggestions: z.array(z.string()),
  cta: z.string(),
  estimatedReadTime: z.string(),
});

export const instagramContentSchema = z.object({
  carouselSlides: z.array(
    z.object({
      slideNumber: z.number(),
      text: z.string(),
      imageDescription: z.string(),
      altText: z.string(),
    })
  ),
  caption: z.string(),
  hashtags: z.array(z.string()),
  postingTimeSuggestion: z.string(),
  contentType: z.enum(["carousel", "reel", "story", "single"]),
});

export const tiktokContentSchema = z.object({
  hook: z.string(),
  scriptBody: z.string(),
  cta: z.string(),
  shotList: z.array(
    z.object({
      shotNumber: z.number(),
      description: z.string(),
      duration: z.string(),
      angle: z.string(),
    })
  ),
  musicSuggestions: z.array(z.string()),
  trendingHashtags: z.array(z.string()),
  caption: z.string(),
});

export const twitterContentSchema = z.object({
  tweets: z.array(z.string()),
  threadSeparated: z.array(z.string()),
  quoteTweetSuggestions: z.array(z.string()),
  replyHooks: z.array(z.string()),
  hashtags: z.array(z.string()),
});

export const pinterestContentSchema = z.object({
  pinTitle: z.string(),
  description: z.string(),
  boardSuggestion: z.string(),
  imageDescription: z.string(),
  keywords: z.array(z.string()),
  altText: z.string(),
});

export const youtubeContentSchema = z.object({
  title: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  thumbnailConcept: z.string(),
  script: z.object({
    introHook: z.string(),
    bodySegments: z.array(
      z.object({
        segmentTitle: z.string(),
        content: z.string(),
        timestamp: z.string(),
      })
    ),
    cta: z.string(),
    outro: z.string(),
  }),
});

export const linkedinContentSchema = z.object({
  post: z.string(),
  articleOutline: z
    .object({
      title: z.string(),
      sections: z.array(z.string()),
    })
    .optional(),
  hashtags: z.array(z.string()),
  toneGuidance: z.string(),
});

export const redditContentSchema = z.object({
  postTitle: z.string(),
  postBody: z.string(),
  suggestedSubreddits: z.array(z.string()),
  commentEngagementStrategy: z.array(z.string()),
  flairSuggestion: z.string().optional(),
});

export const discordContentSchema = z.object({
  introChannelMessage: z.string(),
  generalChannelMessage: z.string(),
  showcaseChannelMessage: z.string(),
  engagementPrompts: z.array(z.string()),
});

export const threadsContentSchema = z.object({
  postText: z.string(),
  conversationStarters: z.array(z.string()),
  replyStrategy: z.array(z.string()),
});

export const emailNewsletterContentSchema = z.object({
  subjectLine: z.string(),
  previewText: z.string(),
  bodySections: z.array(
    z.object({
      heading: z.string(),
      content: z.string(),
    })
  ),
  ctaButtons: z.array(
    z.object({
      text: z.string(),
      description: z.string(),
    })
  ),
  segmentationSuggestions: z.array(z.string()),
});

// --- Schema lookup map ---

export const platformContentSchemas = {
  blog: blogContentSchema,
  instagram: instagramContentSchema,
  tiktok: tiktokContentSchema,
  twitter: twitterContentSchema,
  pinterest: pinterestContentSchema,
  youtube: youtubeContentSchema,
  linkedin: linkedinContentSchema,
  reddit: redditContentSchema,
  discord: discordContentSchema,
  threads: threadsContentSchema,
  email: emailNewsletterContentSchema,
} as const;

// ----------------------------------------------------------------------------
// Campaign Calendar Schemas
// ----------------------------------------------------------------------------

export const calendarEntrySchema = z.object({
  dayNumber: z.number().int().positive(),
  platform: campaignPlatformSchema,
  contentType: z.string(),
  title: z.string(),
  postingTime: z.string(),
  pillar: z.string(),
  notes: z.string().optional(),
});

export const campaignCalendarSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  totalPosts: z.number(),
  entries: z.array(calendarEntrySchema).min(1),
  weeklyOverview: z.array(
    z.object({
      week: z.number(),
      focus: z.string(),
      platforms: z.array(z.string()),
    })
  ),
});

// ----------------------------------------------------------------------------
// Cohesion Check Schemas
// ----------------------------------------------------------------------------

export const cohesionFlagSchema = z.object({
  dimension: z.enum(["messaging", "tone", "factual", "strategic"]),
  content_ids: z.array(z.string()),
  issue: z.string(),
  fix: z.string(),
});

export const cohesionDimensionSchema = z.object({
  score: z.number().min(0).max(100),
  flags: z.array(cohesionFlagSchema),
});

export const cohesionRecommendationSchema = z.object({
  text: z.string(),
  content_ids: z.array(z.string()),
  priority: z.enum(["high", "medium", "low"]),
});

export const cohesionCheckResultSchema = z.object({
  overall_score: z.number().min(0).max(100),
  messaging: cohesionDimensionSchema,
  tone: cohesionDimensionSchema,
  factual: cohesionDimensionSchema,
  strategic: cohesionDimensionSchema,
  recommendations: z.array(cohesionRecommendationSchema),
});

export type CohesionCheckResult = z.infer<typeof cohesionCheckResultSchema>;
export type CohesionFlag = z.infer<typeof cohesionFlagSchema>;
export type CohesionDimension = z.infer<typeof cohesionDimensionSchema>;
export type CohesionRecommendation = z.infer<
  typeof cohesionRecommendationSchema
>;
