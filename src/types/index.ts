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

export type PrimaryGoal =
  | "pre-launch"
  | "grow-existing"
  | "promote-product"
  | "thought-leadership";

export interface QuizResponse {
  // Step 1: Your Product
  productType: ProductType;
  elevatorPitch: string;
  problemSolved: string;
  currentStage: CurrentStage;
  // Step 2: Your Audience
  idealCustomer: string;
  industryNiche: string[];
  preferredPlatforms: Platform[];
  businessModel: BusinessModel;
  budgetRange: BudgetRange;
  // Step 3: Your Goals
  primaryGoal: PrimaryGoal;
  launchTimeline: string;
  weeklyTimeCommitment: number;
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

export type ConfidenceLevel = "quiz_based" | "data_informed" | "data_validated";

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
// Campaign Types
// ----------------------------------------------------------------------------

export type CampaignPlatform =
  | "blog"
  | "instagram"
  | "tiktok"
  | "twitter"
  | "pinterest"
  | "youtube"
  | "linkedin"
  | "reddit"
  | "discord"
  | "threads"
  | "email";

export type CampaignGoal =
  | "build-awareness"
  | "drive-engagement"
  | "generate-leads"
  | "promote-product"
  | "educate";

export type CampaignDuration =
  | "1-week"
  | "2-weeks"
  | "4-weeks"
  | "8-weeks"
  | "12-weeks";

export type ContentApprovalStatus =
  | "pending_review"
  | "approved"
  | "rejected"
  | "needs_revision";

export type CampaignStatus =
  | "draft"
  | "strategy_pending"
  | "strategy_complete"
  | "calendar_pending"
  | "calendar_complete"
  | "generating_content"
  | "complete"
  | "failed";

export type CampaignContentStatus =
  | "pending"
  | "generating"
  | "complete"
  | "failed";

export interface CampaignCreatorInput {
  name: string;
  goal: CampaignGoal;
  topic: string;
  platforms: CampaignPlatform[];
  duration: CampaignDuration;
  frequencyConfig: Record<string, number>;
}

export interface CampaignGeneratorOutput {
  strategySummary: string;
  contentPillars: ContentPillar[];
  contentPlan: {
    platform: CampaignPlatform;
    contentType: ContentType;
    pillar: string;
    title: string;
    scheduledDay: number;
  }[];
}

// --- Campaign Strategy ---

export interface CampaignMessagingFramework {
  coreMessage: string;
  supportingMessages: string[];
  toneGuidelines: string;
  keyPhrases: string[];
  avoidPhrases: string[];
}

export interface CampaignPlatformAllocation {
  platform: CampaignPlatform;
  role: string;
  contentFocus: string;
  frequencySuggestion: string;
  priorityOrder: number;
}

export interface CampaignStrategy {
  campaignName: string;
  theme: string;
  goal: string;
  targetOutcome: string;
  timelineWeeks: number;
  messagingFramework: CampaignMessagingFramework;
  platformAllocations: CampaignPlatformAllocation[];
  contentPillars: ContentPillar[];
  audienceHooks: string[];
}

// --- Platform-Specific Content Types ---

export interface BlogContent {
  title: string;
  metaDescription: string;
  keywords: string[];
  headers: { level: number; text: string }[];
  bodyMarkdown: string;
  internalLinkingSuggestions: string[];
  cta: string;
  estimatedReadTime: string;
}

export interface InstagramContent {
  carouselSlides: {
    slideNumber: number;
    text: string;
    imageDescription: string;
    altText: string;
  }[];
  caption: string;
  hashtags: string[];
  postingTimeSuggestion: string;
  contentType: "carousel" | "reel" | "story" | "single";
}

export interface TikTokContent {
  hook: string;
  scriptBody: string;
  cta: string;
  shotList: {
    shotNumber: number;
    description: string;
    duration: string;
    angle: string;
  }[];
  musicSuggestions: string[];
  trendingHashtags: string[];
  caption: string;
}

export interface TwitterContent {
  tweets: string[];
  threadSeparated: string[];
  quoteTweetSuggestions: string[];
  replyHooks: string[];
  hashtags: string[];
}

export interface PinterestContent {
  pinTitle: string;
  description: string;
  boardSuggestion: string;
  imageDescription: string;
  keywords: string[];
  altText: string;
}

export interface YouTubeContent {
  title: string;
  description: string;
  tags: string[];
  thumbnailConcept: string;
  script: {
    introHook: string;
    bodySegments: {
      segmentTitle: string;
      content: string;
      timestamp: string;
    }[];
    cta: string;
    outro: string;
  };
}

export interface LinkedInContent {
  post: string;
  articleOutline?: { title: string; sections: string[] };
  hashtags: string[];
  toneGuidance: string;
}

export interface RedditContent {
  postTitle: string;
  postBody: string;
  suggestedSubreddits: string[];
  commentEngagementStrategy: string[];
  flairSuggestion?: string;
}

export interface DiscordContent {
  introChannelMessage: string;
  generalChannelMessage: string;
  showcaseChannelMessage: string;
  engagementPrompts: string[];
}

export interface ThreadsContent {
  postText: string;
  conversationStarters: string[];
  replyStrategy: string[];
}

export interface EmailNewsletterContent {
  subjectLine: string;
  previewText: string;
  bodySections: { heading: string; content: string }[];
  ctaButtons: { text: string; description: string }[];
  segmentationSuggestions: string[];
}

// --- Campaign Calendar ---

export interface CalendarEntry {
  dayNumber: number;
  platform: CampaignPlatform;
  contentType: string;
  title: string;
  postingTime: string;
  pillar: string;
  notes?: string;
}

export interface CampaignCalendar {
  startDate: string;
  endDate: string;
  totalPosts: number;
  entries: CalendarEntry[];
  weeklyOverview: { week: number; focus: string; platforms: string[] }[];
}

// ----------------------------------------------------------------------------
// Connected Account / Publish Types
// ----------------------------------------------------------------------------

export type SocialPlatform =
  | "reddit"
  | "instagram"
  | "tiktok"
  | "twitter"
  | "youtube"
  | "threads"
  | "linkedin";

export type PublishStatus = "scheduled" | "publishing" | "published" | "failed";

export interface ConnectedAccount {
  id: string;
  userId: string;
  platform: SocialPlatform;
  accountName: string | null;
  accountId: string | null;
  isActive: boolean;
  tokenExpiresAt: Date | null;
  scopes: string[] | null;
  createdAt: Date;
}

export interface PublishRequest {
  contentId: string;
  scheduledFor?: Date;
}

export interface PublishResult {
  contentId: string;
  status: PublishStatus;
  externalPostId?: string;
  externalPostUrl?: string;
  error?: string;
}

export interface OAuthState {
  platform: SocialPlatform;
  userId: string;
  redirectUri: string;
}

// ----------------------------------------------------------------------------
// Analytics Types
// ----------------------------------------------------------------------------

export interface PlatformMetrics {
  platform: string;
  reach: number;
  impressions: number;
  engagements: number;
  engagementRate: number;
}

export interface PillarMetrics {
  pillar: string;
  totalReach: number;
  totalEngagements: number;
  avgEngagementRate: number;
  contentCount: number;
}

export interface ContentRanking {
  contentId: string;
  title: string | null;
  platform: string;
  pillar: string | null;
  reach: number;
  engagements: number;
  engagementRate: number;
}

export interface CampaignAnalyticsData {
  totalReach: number;
  totalEngagements: number;
  totalImpressions: number;
  engagementRate: number;
  followerGrowth: number;
  platformBreakdown: PlatformMetrics[];
  pillarBreakdown: PillarMetrics[];
  contentRankings: ContentRanking[];
  aiInsights: string[];
  aiRecommendations: string[];
  snapshotDate: string;
}

export interface AnalyticsInsightsInput {
  campaignName: string;
  strategySummary: string;
  platformBreakdown: PlatformMetrics[];
  pillarBreakdown: PillarMetrics[];
  contentRankings: ContentRanking[];
}

export interface AnalyticsInsightsResult {
  insights: string[];
  recommendations: string[];
  audienceUpdates: {
    confidenceLevel: ConfidenceLevel;
    newPatterns: string[];
  };
}

// ----------------------------------------------------------------------------
// Content Enrichment Types (Image Generation, Scoring, SEO)
// ----------------------------------------------------------------------------

export interface MediaAsset {
  type: "image" | "storyboard_frame";
  imageUrl: string;
  revisedPrompt: string;
  originalDescription: string;
  altText: string;
  dimensions: { width: number; height: number };
  slideNumber?: number;
  shotNumber?: number;
}

export interface MediaSuggestions {
  assets: MediaAsset[];
  generatedAt: string;
}

export interface ContentScores {
  engagementPotential: number;
  brandVoiceAlignment: number;
  platformFit: number;
  overallScore: number;
  feedback: string[];
  suggestions: string[];
  scoredAt: string;
}

export interface HashtagAnalysis {
  current: string[];
  suggested: string[];
  trending: string[];
  removed: string[];
  reasoning: string;
}

export interface SeoAnalysis {
  keywordDensity: Record<string, number>;
  missingKeywords: string[];
  metaDescriptionScore: number;
  headingStructureScore: number;
  readabilityScore: number;
  suggestions: string[];
}

export interface PostingTimeRecommendation {
  bestTime: string;
  timezone: string;
  reasoning: string;
  alternativeTimes: string[];
}

export interface SeoOptimizationData {
  hashtags?: HashtagAnalysis;
  seo?: SeoAnalysis;
  postingTime: PostingTimeRecommendation;
  optimizedAt: string;
}

export interface ContentEnrichments {
  media?: MediaSuggestions;
  scores?: ContentScores;
  seoData?: SeoOptimizationData;
}

// ----------------------------------------------------------------------------
// Agent Types
// ----------------------------------------------------------------------------

export type AgentType =
  | "audience_analysis"
  | "content_generation"
  | "campaign_strategy"
  | "campaign_calendar"
  | "campaign_content"
  | "analytics_insights"
  | "image_generation"
  | "content_scoring"
  | "seo_optimization";

export type AgentStatus = "success" | "failed" | "partial";

// ----------------------------------------------------------------------------
// API Response Type
// ----------------------------------------------------------------------------

export type ApiResponse<T> =
  | { data: T; error: null }
  | { data: null; error: { message: string; code: string } };
