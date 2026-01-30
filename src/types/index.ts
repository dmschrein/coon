// ============================================================================
// Community Builder MVP - Type Definitions
// ============================================================================

// ----------------------------------------------------------------------------
// Quiz Types
// ----------------------------------------------------------------------------

export type ProductType = "saas" | "physical" | "service" | "content" | "other";

export type CurrentStage = "idea" | "mvp" | "beta" | "launched";

export type BudgetRange = "free" | "low" | "medium" | "high" | "enterprise";

export type BusinessModel = "b2b" | "b2c" | "both";

export type Platform =
  | "twitter"
  | "linkedin"
  | "reddit"
  | "discord"
  | "youtube"
  | "tiktok"
  | "instagram"
  | "threads"
  | "hackernews"
  | "producthunt"
  | "indiehackers";

export type ContentComfortLevel = "beginner" | "intermediate" | "advanced";

export interface Competitor {
  name: string;
  url?: string;
  notes?: string;
}

export interface QuizResponse {
  productType: ProductType;
  elevatorPitch: string;
  problemSolved: string;
  uniqueAngle: string;
  currentStage: CurrentStage;
  idealCustomer: string;
  industryNiche: string[];
  customerPainPoints: string[];
  currentSolutions: string[];
  budgetRange: BudgetRange;
  businessModel: BusinessModel;
  competitors: Competitor[];
  competitorStrengths: string[];
  competitorWeaknesses: string[];
  differentiators: string[];
  launchTimeline: string;
  targetAudienceSize: number;
  weeklyTimeCommitment: number;
  preferredPlatforms: Platform[];
  contentComfortLevel: ContentComfortLevel;
}

// ----------------------------------------------------------------------------
// Audience / Persona Types
// ----------------------------------------------------------------------------

export interface Persona {
  name: string;
  description: string;
  painPoints: string[];
  goals: string[];
  objections: string[];
  messagingAngle: string;
}

export interface AudienceProfile {
  primaryPersonas: Persona[];
  psychographics: {
    values: string[];
    motivations: string[];
    frustrations: string[];
    goals: string[];
  };
  demographics: {
    ageRange: [number, number];
    locations: string[];
    jobTitles: string[];
    incomeRange?: string;
  };
  behavioralPatterns: {
    contentConsumption: string[];
    purchaseDrivers: string[];
    decisionMakingProcess: string;
  };
  keywords: string[];
  hashtags: string[];
}

// ----------------------------------------------------------------------------
// Content Types
// ----------------------------------------------------------------------------

export type ContentType =
  | "educational"
  | "story"
  | "question"
  | "poll"
  | "behind-the-scenes"
  | "tip"
  | "thread"
  | "comment"
  | "resource"
  | "case-study"
  | "meme"
  | "announcement";

export interface ContentDraft {
  headline?: string;
  body: string;
  hashtags?: string[];
  cta?: string;
}

export interface ContentPillar {
  theme: string;
  description: string;
  sampleTopics: string[];
  targetedPainPoint: string;
}

export interface ContentStrategy {
  pillars: ContentPillar[];
  voiceTone: string;
  contentMix: Record<string, number>;
}

export interface GeneratedContent {
  platform: Platform;
  contentType: ContentType;
  pillar: string;
  draft: ContentDraft;
}

export interface ContentPlan {
  strategy: ContentStrategy;
  contentDrafts: GeneratedContent[];
}

// ----------------------------------------------------------------------------
// Agent Types
// ----------------------------------------------------------------------------

export type AgentType = "audience_analysis" | "content_generation";

export type AgentStatus = "success" | "failed" | "partial";

// ----------------------------------------------------------------------------
// API Response Type
// ----------------------------------------------------------------------------

export type ApiResponse<T> =
  | { data: T; error: null }
  | { data: null; error: { message: string; code: string } };
