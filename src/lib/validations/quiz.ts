import { z } from "zod";

// ============================================================================
// Quiz Validation Schemas — 3-Step Structure
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

const primaryGoalValues = [
  "pre-launch",
  "grow-existing",
  "promote-product",
  "thought-leadership",
] as const;

// ----------------------------------------------------------------------------
// Step 1: Your Product
// ----------------------------------------------------------------------------

export const yourProductSchema = z.object({
  productType: z.enum(productTypeValues),
  elevatorPitch: z
    .string()
    .min(10, "Elevator pitch must be at least 10 characters")
    .max(280, "Elevator pitch must be at most 280 characters"),
  problemSolved: z
    .string()
    .min(10, "Problem description must be at least 10 characters"),
  currentStage: z.enum(currentStageValues),
});

export type YourProduct = z.infer<typeof yourProductSchema>;

// ----------------------------------------------------------------------------
// Step 2: Your Audience
// ----------------------------------------------------------------------------

export const yourAudienceSchema = z.object({
  idealCustomer: z
    .string()
    .min(10, "Ideal customer description must be at least 10 characters"),
  industryNiche: z
    .array(z.string())
    .min(1, "At least one industry niche is required"),
  preferredPlatforms: z
    .array(z.enum(platformValues))
    .min(1, "At least one platform is required"),
  businessModel: z.enum(businessModelValues),
  budgetRange: z.enum(budgetRangeValues),
});

export type YourAudience = z.infer<typeof yourAudienceSchema>;

// ----------------------------------------------------------------------------
// Step 3: Your Goals
// ----------------------------------------------------------------------------

export const yourGoalsSchema = z.object({
  primaryGoal: z.enum(primaryGoalValues),
  launchTimeline: z.string().datetime({ message: "Must be a valid ISO date" }),
  weeklyTimeCommitment: z
    .number()
    .min(1, "Weekly time commitment must be at least 1 hour")
    .max(20, "Weekly time commitment must be at most 20 hours"),
  contentComfortLevel: z.enum(contentComfortLevelValues),
});

export type YourGoals = z.infer<typeof yourGoalsSchema>;

// ----------------------------------------------------------------------------
// Full Quiz Schema — merges all 3 steps
// ----------------------------------------------------------------------------

export const fullQuizSchema = yourProductSchema
  .merge(yourAudienceSchema)
  .merge(yourGoalsSchema);

export type FullQuizResponse = z.infer<typeof fullQuizSchema>;

// Re-export value arrays for use in components
export {
  productTypeValues,
  currentStageValues,
  budgetRangeValues,
  businessModelValues,
  platformValues,
  contentComfortLevelValues,
  primaryGoalValues,
};
