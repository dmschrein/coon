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
  updateBody(id: string, body: string): Promise<void>;
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
