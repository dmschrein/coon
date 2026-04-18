/**
 * Enrichment Service - Handles media generation, content scoring,
 * and SEO optimization for campaign content.
 */

import type {
  CampaignContentRepository,
  CampaignRepository,
} from "../repositories/interfaces";
import type {
  CampaignPlatform,
  ContentEnrichments,
  ContentScores,
  MediaSuggestions,
  SeoOptimizationData,
} from "@/types";

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
  constructor(
    private contentRepo: CampaignContentRepository,
    private mediaAgent: MediaEnrichmentAgent,
    private scoringAgent: ContentScoringAgent,
    private campaignRepo: CampaignRepository,
    private seoAgent: SeoOptimizationAgent
  ) {}

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
