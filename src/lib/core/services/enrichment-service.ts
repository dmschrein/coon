/**
 * Enrichment Service - Handles media generation, content scoring,
 * and SEO optimization for campaign content.
 */

import type {
  CampaignContentRepository,
  CampaignRepository,
  EngagementRepository,
  PostEngagementRow,
} from "../repositories/interfaces";
import type {
  CampaignPlatform,
  ContentEnrichments,
  ContentScores,
  MediaSuggestions,
  SeoOptimizationData,
  SocialPlatform,
} from "@/types";
import type {
  SocialPlatformAdapter,
  PlatformEngagement,
} from "@/lib/services/social/types";

interface MediaEnrichmentAgent {
  enrichContentWithMedia(
    contentData: unknown,
    platform: CampaignPlatform
  ): Promise<MediaSuggestions>;
  isVisualPlatform(platform: CampaignPlatform): boolean;
}

interface ContentScoringAgent {
  scoreContent(input: {
    platform: CampaignPlatform;
    contentData: unknown;
    title: string | null;
    body: string | null;
    strategySummary: string | null;
    audienceSummary: string | null;
  }): Promise<{ result: ContentScores; modelUsed: string; tokensUsed: number }>;
}

interface SeoOptimizationAgent {
  optimizeContent(input: {
    platform: CampaignPlatform;
    contentData: unknown;
    title: string | null;
    body: string | null;
    strategySummary: string | null;
    audienceSummary: string | null;
  }): Promise<{
    result: SeoOptimizationData;
    modelUsed: string;
    tokensUsed: number;
  }>;
}

export class EnrichmentService {
  private engagementRepo: EngagementRepository | null;
  private getAdapter:
    | ((platform: SocialPlatform) => SocialPlatformAdapter | null)
    | null;

  constructor(
    private contentRepo: CampaignContentRepository,
    private mediaAgent: MediaEnrichmentAgent,
    private scoringAgent: ContentScoringAgent,
    private campaignRepo: CampaignRepository,
    private seoAgent: SeoOptimizationAgent,
    engagementRepo?: EngagementRepository,
    getAdapter?: (platform: SocialPlatform) => SocialPlatformAdapter | null
  ) {
    this.engagementRepo = engagementRepo ?? null;
    this.getAdapter = getAdapter ?? null;
  }

  // ─── Engagement Ingestion ────────────────────────────────────────────────────

  async fetchAndStoreEngagement(
    contentId: string,
    platform: SocialPlatform,
    postId: string,
    accessToken: string
  ): Promise<PostEngagementRow> {
    if (!this.engagementRepo) {
      throw new Error("Engagement repository not configured");
    }
    if (!this.getAdapter) {
      throw new Error("Social adapter resolver not configured");
    }

    const adapter = this.getAdapter(platform);
    if (!adapter) {
      throw new Error(`No adapter configured for platform: ${platform}`);
    }
    if (!adapter.fetchEngagement) {
      throw new Error(`${platform} adapter does not support fetchEngagement`);
    }

    const engagement: PlatformEngagement = await adapter.fetchEngagement(
      postId,
      accessToken
    );

    return this.engagementRepo.upsertEngagement({
      campaignContentId: contentId,
      platform,
      platformPostId: postId,
      likes: engagement.likes,
      comments: engagement.comments,
      shares: engagement.shares,
      reach: engagement.reach,
      impressions: engagement.impressions,
      engagementRate: engagement.engagementRate ?? undefined,
      recordedAt: engagement.recordedAt,
    });
  }

  // ─── Media Generation ───────────────────────────────────────────────────────

  async generateMediaForContent(
    contentId: string,
    userId: string
  ): Promise<ContentEnrichments> {
    const content = await this.contentRepo.findById(contentId);
    if (!content) throw new Error(`Content not found: ${contentId}`);
    if (content.userId !== userId) throw new Error("Unauthorized");
    if (!this.mediaAgent.isVisualPlatform(content.platform)) {
      throw new Error(`${content.platform} is not a visual platform`);
    }

    const media = await this.mediaAgent.enrichContentWithMedia(
      content.contentData,
      content.platform
    );

    const existing = (content.enrichments as ContentEnrichments) ?? {};
    const enrichments: ContentEnrichments = { ...existing, media };

    await this.contentRepo.updateEnrichments(contentId, enrichments);
    return enrichments;
  }

  async generateMediaBatch(
    campaignId: string,
    userId: string
  ): Promise<{ total: number; succeeded: number; failed: number }> {
    const allContent = await this.contentRepo.findByCampaignId(campaignId);
    const visualContent = allContent.filter(
      (c) =>
        c.userId === userId &&
        c.status === "complete" &&
        this.mediaAgent.isVisualPlatform(c.platform) &&
        !c.hasMedia()
    );

    if (visualContent.length === 0) {
      return { total: 0, succeeded: 0, failed: 0 };
    }

    const results = await Promise.allSettled(
      visualContent.map((c) => this.generateMediaForContent(c.id, userId))
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    return {
      total: visualContent.length,
      succeeded,
      failed: visualContent.length - succeeded,
    };
  }

  // ─── Content Scoring ────────────────────────────────────────────────────────

  async scoreContentPiece(
    contentId: string,
    userId: string
  ): Promise<ContentEnrichments> {
    const content = await this.contentRepo.findById(contentId);
    if (!content) throw new Error(`Content not found: ${contentId}`);
    if (content.userId !== userId) throw new Error("Unauthorized");

    const campaign = await this.campaignRepo.findById(
      content.campaignId,
      userId
    );

    const { result: scores } = await this.scoringAgent.scoreContent({
      platform: content.platform,
      contentData: content.contentData,
      title: content.title,
      body: content.body,
      strategySummary: campaign?.strategySummary ?? null,
      audienceSummary: null,
    });

    const existing = (content.enrichments as ContentEnrichments) ?? {};
    const enrichments: ContentEnrichments = { ...existing, scores };

    await this.contentRepo.updateEnrichments(contentId, enrichments);
    return enrichments;
  }

  async scoreCampaignContent(
    campaignId: string,
    userId: string
  ): Promise<{ total: number; succeeded: number; failed: number }> {
    const allContent = await this.contentRepo.findByCampaignId(campaignId);
    const scorable = allContent.filter(
      (c) => c.userId === userId && c.status === "complete"
    );

    if (scorable.length === 0) {
      return { total: 0, succeeded: 0, failed: 0 };
    }

    const results = await Promise.allSettled(
      scorable.map((c) => this.scoreContentPiece(c.id, userId))
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    return {
      total: scorable.length,
      succeeded,
      failed: scorable.length - succeeded,
    };
  }

  // ─── SEO Optimization ───────────────────────────────────────────────────────

  async optimizeContentPiece(
    contentId: string,
    userId: string
  ): Promise<ContentEnrichments> {
    const content = await this.contentRepo.findById(contentId);
    if (!content) throw new Error(`Content not found: ${contentId}`);
    if (content.userId !== userId) throw new Error("Unauthorized");

    const campaign = await this.campaignRepo.findById(
      content.campaignId,
      userId
    );

    const { result: seoData } = await this.seoAgent.optimizeContent({
      platform: content.platform,
      contentData: content.contentData,
      title: content.title,
      body: content.body,
      strategySummary: campaign?.strategySummary ?? null,
      audienceSummary: null,
    });

    const existing = (content.enrichments as ContentEnrichments) ?? {};
    const enrichments: ContentEnrichments = { ...existing, seoData };

    await this.contentRepo.updateEnrichments(contentId, enrichments);
    return enrichments;
  }

  async optimizeCampaignContent(
    campaignId: string,
    userId: string
  ): Promise<{ total: number; succeeded: number; failed: number }> {
    const allContent = await this.contentRepo.findByCampaignId(campaignId);
    const optimizable = allContent.filter(
      (c) => c.userId === userId && c.status === "complete"
    );

    if (optimizable.length === 0) {
      return { total: 0, succeeded: 0, failed: 0 };
    }

    const results = await Promise.allSettled(
      optimizable.map((c) => this.optimizeContentPiece(c.id, userId))
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    return {
      total: optimizable.length,
      succeeded,
      failed: optimizable.length - succeeded,
    };
  }
}
