/**
 * Analytics Service - Orchestrates campaign analytics, metric aggregation,
 * AI insight generation, and audience profile flywheel updates.
 */

import type {
  AnalyticsRepository,
  CampaignRepository,
  CampaignContentRepository,
  AudienceProfileRepository,
  AgentRunRepository,
} from "../repositories/interfaces";
import type {
  CampaignAnalyticsData,
  PlatformMetrics,
  PillarMetrics,
  ContentRanking,
  AnalyticsInsightsInput,
  AnalyticsInsightsResult,
  ConfidenceLevel,
} from "@/types";
import { ServiceError } from "./audience-service";

interface AnalyticsInsightsAgent {
  generateAnalyticsInsights: (input: AnalyticsInsightsInput) => Promise<{
    result: AnalyticsInsightsResult;
    modelUsed: string;
    tokensUsed: number;
  }>;
}

export class AnalyticsService {
  constructor(
    private analyticsRepo: AnalyticsRepository,
    private campaignRepo: CampaignRepository,
    private contentRepo: CampaignContentRepository,
    private profileRepo: AudienceProfileRepository,
    private agentRunRepo: AgentRunRepository,
    private insightsAgent: AnalyticsInsightsAgent
  ) {}

  async getCampaignAnalytics(
    campaignId: string,
    userId: string
  ): Promise<CampaignAnalyticsData | null> {
    const snapshot = await this.analyticsRepo.getLatestCampaignSnapshot(
      campaignId,
      userId
    );

    if (!snapshot) return null;

    const contentMetrics = await this.analyticsRepo.getContentAnalytics(
      campaignId,
      userId
    );

    // Build content rankings from content analytics + campaign content
    const content = await this.contentRepo.findByCampaignId(campaignId);
    const contentRankings: ContentRanking[] = contentMetrics.map((m) => {
      const piece = content.find((c) => c.id === m.campaignContentId);
      const engagements = m.likes + m.comments + m.shares + m.saves;
      return {
        contentId: m.campaignContentId,
        title: piece?.title ?? null,
        platform: m.platform,
        pillar: piece?.pillar ?? null,
        reach: m.reach,
        engagements,
        engagementRate: m.reach > 0 ? (engagements / m.reach) * 100 : 0,
      };
    });

    contentRankings.sort((a, b) => b.engagements - a.engagements);

    return {
      totalReach: snapshot.totalReach,
      totalEngagements: snapshot.totalEngagements,
      totalImpressions: snapshot.totalImpressions,
      engagementRate: parseFloat(snapshot.engagementRate ?? "0"),
      followerGrowth: snapshot.followerGrowth,
      platformBreakdown:
        (snapshot.platformBreakdown as PlatformMetrics[]) ?? [],
      pillarBreakdown: (snapshot.pillarBreakdown as PillarMetrics[]) ?? [],
      contentRankings,
      aiInsights: (snapshot.aiInsights as string[]) ?? [],
      aiRecommendations: (snapshot.aiRecommendations as string[]) ?? [],
      snapshotDate: snapshot.snapshotDate.toISOString(),
    };
  }

  async generateInsights(
    campaignId: string,
    userId: string
  ): Promise<CampaignAnalyticsData> {
    const campaign = await this.campaignRepo.findById(campaignId, userId);
    if (!campaign) {
      throw new ServiceError("Campaign not found");
    }

    // Aggregate content analytics into platform and pillar breakdowns
    const contentMetrics = await this.analyticsRepo.getContentAnalytics(
      campaignId,
      userId
    );
    const content = await this.contentRepo.findByCampaignId(campaignId);

    const platformMap = new Map<string, PlatformMetrics>();
    const pillarMap = new Map<string, PillarMetrics>();

    for (const m of contentMetrics) {
      const engagements = m.likes + m.comments + m.shares + m.saves;
      const rate = m.reach > 0 ? (engagements / m.reach) * 100 : 0;

      // Platform aggregation
      const existing = platformMap.get(m.platform) ?? {
        platform: m.platform,
        reach: 0,
        impressions: 0,
        engagements: 0,
        engagementRate: 0,
      };
      existing.reach += m.reach;
      existing.impressions += m.impressions;
      existing.engagements += engagements;
      platformMap.set(m.platform, existing);

      // Pillar aggregation
      const piece = content.find((c) => c.id === m.campaignContentId);
      const pillarName = piece?.pillar ?? "uncategorized";
      const pillarExisting = pillarMap.get(pillarName) ?? {
        pillar: pillarName,
        totalReach: 0,
        totalEngagements: 0,
        avgEngagementRate: 0,
        contentCount: 0,
      };
      pillarExisting.totalReach += m.reach;
      pillarExisting.totalEngagements += engagements;
      pillarExisting.contentCount += 1;
      pillarMap.set(pillarName, pillarExisting);
    }

    // Calculate rates
    const platformBreakdown = Array.from(platformMap.values()).map((p) => ({
      ...p,
      engagementRate:
        p.reach > 0 ? Math.round((p.engagements / p.reach) * 10000) / 100 : 0,
    }));
    const pillarBreakdown = Array.from(pillarMap.values()).map((p) => ({
      ...p,
      avgEngagementRate:
        p.totalReach > 0
          ? Math.round((p.totalEngagements / p.totalReach) * 10000) / 100
          : 0,
    }));

    // Build content rankings
    const contentRankings: ContentRanking[] = contentMetrics.map((m) => {
      const piece = content.find((c) => c.id === m.campaignContentId);
      const engagements = m.likes + m.comments + m.shares + m.saves;
      return {
        contentId: m.campaignContentId,
        title: piece?.title ?? null,
        platform: m.platform,
        pillar: piece?.pillar ?? null,
        reach: m.reach,
        engagements,
        engagementRate: m.reach > 0 ? (engagements / m.reach) * 100 : 0,
      };
    });
    contentRankings.sort((a, b) => b.engagements - a.engagements);

    // Totals
    const totalReach = platformBreakdown.reduce((s, p) => s + p.reach, 0);
    const totalEngagements = platformBreakdown.reduce(
      (s, p) => s + p.engagements,
      0
    );
    const totalImpressions = platformBreakdown.reduce(
      (s, p) => s + p.impressions,
      0
    );
    const engagementRate =
      totalReach > 0
        ? Math.round((totalEngagements / totalReach) * 10000) / 100
        : 0;

    // Run AI insights agent
    const startTime = Date.now();
    let aiInsights: string[] = [];
    let aiRecommendations: string[] = [];

    try {
      const insightsInput: AnalyticsInsightsInput = {
        campaignName: campaign.name ?? "Campaign",
        strategySummary: campaign.strategySummary ?? "",
        platformBreakdown,
        pillarBreakdown,
        contentRankings: contentRankings.slice(0, 10),
      };

      const { result, modelUsed, tokensUsed } =
        await this.insightsAgent.generateAnalyticsInsights(insightsInput);
      const durationMs = Date.now() - startTime;

      aiInsights = result.insights;
      aiRecommendations = result.recommendations;

      await this.agentRunRepo.log({
        userId,
        agentType: "analytics_insights",
        inputData: { campaignId },
        outputData: { insights: result.insights.length },
        modelUsed,
        tokensUsed,
        durationMs,
        status: "success",
      });

      // Flywheel: update audience profile confidence level
      if (result.audienceUpdates && campaign.audienceProfileId) {
        await this.updateAudienceConfidence(
          campaign.audienceProfileId,
          result.audienceUpdates.confidenceLevel,
          result.audienceUpdates.newPatterns
        );
      }
    } catch (error) {
      const durationMs = Date.now() - startTime;
      await this.agentRunRepo.log({
        userId,
        agentType: "analytics_insights",
        inputData: { campaignId },
        durationMs,
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });
    }

    // Save snapshot
    const snapshot = await this.analyticsRepo.saveCampaignSnapshot({
      campaignId,
      userId,
      totalReach,
      totalEngagements,
      totalImpressions,
      engagementRate: engagementRate.toString(),
      followerGrowth: 0,
      platformBreakdown,
      pillarBreakdown,
      aiInsights,
      aiRecommendations,
    });

    return {
      totalReach,
      totalEngagements,
      totalImpressions,
      engagementRate,
      followerGrowth: 0,
      platformBreakdown,
      pillarBreakdown,
      contentRankings,
      aiInsights,
      aiRecommendations,
      snapshotDate: snapshot.snapshotDate.toISOString(),
    };
  }

  private async updateAudienceConfidence(
    profileId: string,
    confidenceLevel: ConfidenceLevel,
    newPatterns: string[]
  ): Promise<void> {
    const profile = await this.profileRepo.findById(profileId);
    if (!profile) return;

    // Only upgrade confidence, never downgrade
    const levels: ConfidenceLevel[] = [
      "quiz_based",
      "data_informed",
      "data_validated",
    ];
    const currentIdx = levels.indexOf(profile.confidenceLevel);
    const newIdx = levels.indexOf(confidenceLevel);

    if (newIdx > currentIdx) {
      profile.confidenceLevel = confidenceLevel;
    }

    // Store new patterns in analytics data
    const existingPatterns =
      (profile.analyticsData as { patterns?: string[] })?.patterns ?? [];
    profile.analyticsData = {
      ...(profile.analyticsData as Record<string, unknown>),
      patterns: [...existingPatterns, ...newPatterns],
      lastUpdated: new Date().toISOString(),
    };
  }
}
