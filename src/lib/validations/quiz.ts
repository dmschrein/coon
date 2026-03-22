import { z } from "zod";

// ============================================================================
// Quiz Validation Schemas
// ============================================================================

const productTypeValues = [
  "saas",
  "physical",
  "service",
  "content",
  "other",
] as const;

const currentStageValues = ["idea", "mvp", "beta", "launched"] as const;

const budgetRangeValues = [
  "free",
  "low",
  "medium",
  "high",
  "enterprise",
] as const;

const businessModelValues = ["b2b", "b2c", "both"] as const;

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

const contentComfortLevelValues = [
  "beginner",
  "intermediate",
  "advanced",
] as const;

// ----------------------------------------------------------------------------
// Section 1: Product Definition (Step 1 of simplified quiz)
// ----------------------------------------------------------------------------

export const productDefinitionSchema = z.object({
  productType: z.enum(productTypeValues),
  elevatorPitch: z
    .string()
    .min(10, "Elevator pitch must be at least 10 characters")
    .max(280, "Elevator pitch must be at most 280 characters"),
  problemSolved: z
    .string()
    .min(10, "Problem description must be at least 10 characters"),
  uniqueAngle: z
    .string()
    .min(10, "Unique angle must be at least 10 characters"),
  currentStage: z.enum(currentStageValues),
});

export type ProductDefinition = z.infer<typeof productDefinitionSchema>;

// ----------------------------------------------------------------------------
// Section 2: Target Audience (Step 2 of simplified quiz — required fields)
// ----------------------------------------------------------------------------

export const targetCustomerSchema = z.object({
  idealCustomer: z
    .string()
    .min(10, "Ideal customer description must be at least 10 characters"),
  industryNiche: z
    .array(z.string())
    .min(1, "At least one industry niche is required"),
  customerPainPoints: z
    .array(z.string())
    .min(1, "At least one customer pain point is required"),
  preferredPlatforms: z
    .array(z.enum(platformValues))
    .min(1, "At least one platform is required"),
  // Optional fields with defaults
  currentSolutions: z.array(z.string()).default([]),
  budgetRange: z.enum(budgetRangeValues).default("low"),
  businessModel: z.enum(businessModelValues).default("b2c"),
});

export type TargetCustomer = z.infer<typeof targetCustomerSchema>;

// ----------------------------------------------------------------------------
// Section 3: Competitive Landscape (advanced — all optional)
// ----------------------------------------------------------------------------

const competitorSchema = z.object({
  name: z.string(),
  url: z.string().optional(),
  notes: z.string().optional(),
});

export const competitiveLandscapeSchema = z.object({
  competitors: z.array(competitorSchema).default([]),
  competitorStrengths: z.array(z.string()).default([]),
  competitorWeaknesses: z.array(z.string()).default([]),
  differentiators: z.array(z.string()).default([]),
});

export type CompetitiveLandscape = z.infer<typeof competitiveLandscapeSchema>;

// ----------------------------------------------------------------------------
// Section 4: Community Goals (advanced — all optional with defaults)
// ----------------------------------------------------------------------------

export const communityGoalsSchema = z.object({
  launchTimeline: z
    .string()
    .datetime({ message: "Must be a valid ISO date" })
    .default(() =>
      new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
    ),
  targetAudienceSize: z
    .number()
    .min(0, "Target audience size must be 0 or greater")
    .default(1000),
  weeklyTimeCommitment: z
    .number()
    .min(1, "Weekly time commitment must be at least 1 hour")
    .default(5),
  contentComfortLevel: z.enum(contentComfortLevelValues).default("beginner"),
});

export type CommunityGoals = z.infer<typeof communityGoalsSchema>;

// ----------------------------------------------------------------------------
// Full Quiz Schema — merges all sections; advanced fields are optional
// ----------------------------------------------------------------------------

export const fullQuizSchema = productDefinitionSchema
  .merge(targetCustomerSchema)
  .merge(competitiveLandscapeSchema)
  .merge(communityGoalsSchema);

export type FullQuizResponse = z.infer<typeof fullQuizSchema>;
