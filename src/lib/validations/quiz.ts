import { z } from "zod";

// ============================================================================
// Quiz Validation Schemas
// ============================================================================

// Shared enum values used across schemas
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
// Section 1: Product Definition
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
// Section 2: Target Customer
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
  currentSolutions: z.array(z.string()),
  budgetRange: z.enum(budgetRangeValues),
  businessModel: z.enum(businessModelValues),
});

export type TargetCustomer = z.infer<typeof targetCustomerSchema>;

// ----------------------------------------------------------------------------
// Section 3: Competitive Landscape
// ----------------------------------------------------------------------------

const competitorSchema = z.object({
  name: z.string(),
  url: z.string().optional(),
  notes: z.string().optional(),
});

export const competitiveLandscapeSchema = z.object({
  competitors: z.array(competitorSchema),
  competitorStrengths: z.array(z.string()),
  competitorWeaknesses: z.array(z.string()),
  differentiators: z
    .array(z.string())
    .min(1, "At least one differentiator is required"),
});

export type CompetitiveLandscape = z.infer<typeof competitiveLandscapeSchema>;

// ----------------------------------------------------------------------------
// Section 4: Community Goals
// ----------------------------------------------------------------------------

export const communityGoalsSchema = z.object({
  launchTimeline: z.string().datetime({ message: "Must be a valid ISO date" }),
  targetAudienceSize: z
    .number()
    .min(0, "Target audience size must be 0 or greater"),
  weeklyTimeCommitment: z
    .number()
    .min(1, "Weekly time commitment must be at least 1 hour"),
  preferredPlatforms: z
    .array(z.enum(platformValues))
    .min(1, "At least one platform is required"),
  contentComfortLevel: z.enum(contentComfortLevelValues),
});

export type CommunityGoals = z.infer<typeof communityGoalsSchema>;

// ----------------------------------------------------------------------------
// Full Quiz Schema (merges all 4 sections)
// ----------------------------------------------------------------------------

export const fullQuizSchema = productDefinitionSchema
  .merge(targetCustomerSchema)
  .merge(competitiveLandscapeSchema)
  .merge(communityGoalsSchema);

export type FullQuizResponse = z.infer<typeof fullQuizSchema>;
