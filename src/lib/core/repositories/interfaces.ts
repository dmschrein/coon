/**
 * Repository Interfaces - Abstractions for data access.
 *
 * These define the contract between the service layer and data storage.
 * Implementations can use Drizzle, in-memory (for tests), or any other backend.
 */

import type { Campaign } from "../domain/campaign";
import type { AudienceProfileEntity } from "../domain/audience-profile";
import type { CampaignContentEntity } from "../domain/content";
import type {
  CampaignPlatform,
  CampaignCalendar,
  CampaignStrategy,
  CampaignGoal,
  CampaignDuration,
  ContentPillar,
  ContentApprovalStatus,
  QuizResponse,
  AudienceProfile,
  AgentType,
  AgentStatus,
  SocialPlatform,
  ConnectedAccount,
} from "@/types";

// ─── Campaign Repository ─────────────────────────────────────────────────────

export interface CampaignRepository {
  findById(id: string, userId: string): Promise<Campaign | null>;
  findByUserId(userId: string): Promise<Campaign[]>;
  save(campaign: Campaign): Promise<Campaign>;
  create(params: {
    userId: string;
    selectedPlatforms: CampaignPlatform[];
    audienceProfileId: string;
    quizResponseId: string;
    name: string | null;
    status: string;
    strategyData: CampaignStrategy | null;
    totalTokensUsed: number;
    goal?: CampaignGoal;
    topic?: string;
    duration?: CampaignDuration;
    frequencyConfig?: Record<string, number>;
  }): Promise<Campaign>;
  updatePlan(
    id: string,
    strategySummary: string,
    contentPillars: ContentPillar[],
    tokensUsed: number
  ): Promise<void>;
  updateStrategy(
    id: string,
    strategy: CampaignStrategy,
    name: string,
    tokensUsed: number
  ): Promise<void>;
  updateCalendar(
    id: string,
    calendar: CampaignCalendar,
    tokensUsed: number
  ): Promise<void>;
  updateStatus(id: string, status: string): Promise<void>;
  updateCompletedPlatforms(
    id: string,
    completedPlatforms: CampaignPlatform[],
    tokensUsed: number
  ): Promise<void>;
  updateFields(
    id: string,
    data: {
      name?: string;
      goal?: string;
      topic?: string;
      duration?: string;
      selectedPlatforms?: string[];
      frequencyConfig?: Record<string, number>;
    }
  ): Promise<Campaign | null>;
  updateCohesionResult(
    id: string,
    result: unknown,
    contentHash: string
  ): Promise<void>;
  delete(id: string): Promise<void>;
}

// ─── Audience Profile Repository ──────────────────────────────────────────────

export interface AudienceProfileRepository {
  findActiveByUserId(userId: string): Promise<AudienceProfileEntity | null>;
  findById(id: string): Promise<AudienceProfileEntity | null>;
  create(params: {
    userId: string;
    quizResponseId: string;
    profileData: AudienceProfile;
  }): Promise<AudienceProfileEntity>;
  deactivateAllForUser(userId: string): Promise<void>;
}

// ─── Campaign Content Repository ──────────────────────────────────────────────

export interface CampaignContentRepository {
  findByCampaignId(campaignId: string): Promise<CampaignContentEntity[]>;
  findById(id: string): Promise<CampaignContentEntity | null>;
  createMany(
    items: {
      campaignId: string;
      userId: string;
      platform: CampaignPlatform;
      pillar?: string;
      title?: string;
      scheduledFor?: Date;
    }[]
  ): Promise<void>;
  updateStatus(
    id: string,
    status: string,
    errorMessage?: string
  ): Promise<void>;
  updateContent(
    id: string,
    contentData: unknown,
    tokensUsed: number
  ): Promise<void>;
  updateApprovalStatus(
    id: string,
    approvalStatus: ContentApprovalStatus
  ): Promise<void>;
  bulkUpdateApprovalStatus(
    ids: string[],
    approvalStatus: ContentApprovalStatus
  ): Promise<void>;
  updateBody(id: string, body: string): Promise<void>;
  updateEnrichments(id: string, enrichments: unknown): Promise<void>;
  updateContentPiece(
    id: string,
    data: {
      body: string;
      hashtags: string[];
      mediaSuggestions: unknown;
      aiConfidenceScore: number;
      targetCommunity: string;
      contentData: unknown;
      tokensUsed: number;
    }
  ): Promise<void>;
  delete(id: string): Promise<void>;
  updateSchedule(id: string, scheduledFor: Date): Promise<void>;
  bulkUpdateSchedule(ids: string[], scheduledFor: Date): Promise<void>;
  updateHashtags(id: string, hashtags: string[]): Promise<void>;
  updateTargetCommunity(id: string, targetCommunity: string): Promise<void>;
}

// ─── Quiz Response Repository ─────────────────────────────────────────────────

export interface QuizResponseRepository {
  findLatestByUserId(userId: string): Promise<{
    id: string;
    responseData: QuizResponse;
  } | null>;
}

// ─── Calendar Entry Repository ────────────────────────────────────────────────

export interface CalendarEntryRepository {
  findByCampaignId(campaignId: string): Promise<
    {
      id: string;
      campaignId: string;
      dayNumber: number;
      platform: string;
      contentType: string;
      title: string;
      postingTime: string | null;
      pillar: string | null;
      notes: string | null;
    }[]
  >;
  createMany(
    entries: {
      campaignId: string;
      userId: string;
      dayNumber: number;
      platform: string;
      contentType: string;
      title: string;
      postingTime?: string;
      pillar?: string;
      notes?: string;
    }[]
  ): Promise<void>;
}

// ─── Agent Run Repository ─────────────────────────────────────────────────────

export interface AgentRunRepository {
  log(params: {
    userId: string;
    agentType: AgentType;
    inputData?: unknown;
    outputData?: unknown;
    modelUsed?: string;
    tokensUsed?: number;
    durationMs?: number;
    status: AgentStatus | "failed";
    errorMessage?: string;
  }): Promise<void>;
  getMetrics(params?: {
    agentType?: AgentType;
    since?: Date;
  }): Promise<AgentRunMetrics>;
}

// ─── Connected Account Repository ────────────────────────────────────────────

export interface ConnectedAccountRepository {
  findByUserId(userId: string): Promise<ConnectedAccount[]>;
  findByUserAndPlatform(
    userId: string,
    platform: SocialPlatform
  ): Promise<ConnectedAccount | null>;
  findById(id: string): Promise<ConnectedAccount | null>;
  create(params: {
    userId: string;
    platform: SocialPlatform;
    accessTokenEncrypted: string;
    refreshTokenEncrypted?: string;
    tokenExpiresAt?: Date;
    accountName?: string;
    accountId?: string;
    scopes?: string[];
  }): Promise<ConnectedAccount>;
  updateTokens(
    id: string,
    accessTokenEncrypted: string,
    refreshTokenEncrypted?: string,
    tokenExpiresAt?: Date
  ): Promise<void>;
  deactivate(id: string): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface AgentRunMetrics {
  totalRuns: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  avgDurationMs: number;
  totalTokensUsed: number;
  byAgentType: Record<
    string,
    {
      runs: number;
      successes: number;
      failures: number;
      avgDurationMs: number;
      totalTokensUsed: number;
    }
  >;
}

// ─── Analytics Repository ────────────────────────────────────────────────────

export interface CampaignAnalyticsSnapshot {
  id: string;
  campaignId: string;
  totalReach: number;
  totalEngagements: number;
  totalImpressions: number;
  engagementRate: string | null;
  followerGrowth: number;
  platformBreakdown: unknown;
  pillarBreakdown: unknown;
  aiInsights: unknown;
  aiRecommendations: unknown;
  snapshotDate: Date;
}

export interface ContentAnalyticsRow {
  id: string;
  campaignContentId: string;
  campaignId: string;
  platform: string;
  reach: number;
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  saves: number;
  engagementRate: string | null;
  fetchedAt: Date;
}

export interface AnalyticsRepository {
  getLatestCampaignSnapshot(
    campaignId: string,
    userId: string
  ): Promise<CampaignAnalyticsSnapshot | null>;
  saveCampaignSnapshot(params: {
    campaignId: string;
    userId: string;
    totalReach: number;
    totalEngagements: number;
    totalImpressions: number;
    engagementRate: string;
    followerGrowth: number;
    platformBreakdown: unknown;
    pillarBreakdown: unknown;
    aiInsights: unknown;
    aiRecommendations: unknown;
  }): Promise<CampaignAnalyticsSnapshot>;
  getContentAnalytics(
    campaignId: string,
    userId: string
  ): Promise<ContentAnalyticsRow[]>;
  saveContentAnalytics(params: {
    campaignContentId: string;
    campaignId: string;
    userId: string;
    platform: string;
    reach: number;
    impressions: number;
    likes: number;
    comments: number;
    shares: number;
    clicks: number;
    saves: number;
    engagementRate: string;
  }): Promise<void>;
}
