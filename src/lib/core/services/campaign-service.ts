/**
 * Campaign Service - Orchestrates campaign lifecycle operations.
 *
 * Coordinates between agents, repositories, and plugins.
 * Manages the full campaign pipeline: strategy -> calendar -> content.
 */

import type {
  CampaignRepository,
  AudienceProfileRepository,
  QuizResponseRepository,
  CampaignContentRepository,
  CalendarEntryRepository,
  AgentRunRepository,
} from "../repositories/interfaces";
import type { Campaign } from "../domain/campaign";
import type { PluginRunner } from "../plugins/agent-plugin";
import type {
  CampaignPlatform,
  AudienceProfile,
  QuizResponse,
  CampaignStrategy,
} from "@/types";
import { ServiceError } from "./audience-service";

interface StrategyAgent {
  generateCampaignStrategy: (
    profile: AudienceProfile,
    quiz: QuizResponse,
    selectedPlatforms: CampaignPlatform[]
  ) => Promise<{
    strategy: CampaignStrategy;
    modelUsed: string;
    tokensUsed: number;
  }>;
}

interface CalendarAgent {
  generateCampaignCalendar: (
    strategy: CampaignStrategy,
    profile: AudienceProfile
  ) => Promise<{
    calendar: import("@/types").CampaignCalendar;
    modelUsed: string;
    tokensUsed: number;
  }>;
}

interface ContentAgent {
  generatePlatformBatch: (
    platforms: CampaignPlatform[],
    strategy: CampaignStrategy,
    profile: AudienceProfile,
    quiz: QuizResponse
  ) => Promise<{
    results: {
      platform: CampaignPlatform;
      content: unknown;
      tokensUsed: number;
    }[];
    errors: { platform: CampaignPlatform; error: string }[];
  }>;
  getNextBatch: (platforms: CampaignPlatform[]) => CampaignPlatform[];
}

export class CampaignService {
  constructor(
    private campaignRepo: CampaignRepository,
    private profileRepo: AudienceProfileRepository,
    private quizRepo: QuizResponseRepository,
    private contentRepo: CampaignContentRepository,
    private calendarEntryRepo: CalendarEntryRepository,
    private agentRunRepo: AgentRunRepository,
    private strategyAgent: StrategyAgent,
    private calendarAgent: CalendarAgent,
    private contentAgent: ContentAgent,
    private pluginRunner?: PluginRunner
  ) {}

  async listCampaigns(userId: string): Promise<Campaign[]> {
    return this.campaignRepo.findByUserId(userId);
  }

  async getCampaign(campaignId: string, userId: string) {
    const campaign = await this.campaignRepo.findById(campaignId, userId);
    if (!campaign) {
      throw new ServiceError("Campaign not found", "NOT_FOUND");
    }

    const content = await this.contentRepo.findByCampaignId(campaignId);
    const calendarEntries =
      await this.calendarEntryRepo.findByCampaignId(campaignId);

    return { campaign, content, calendarEntries };
  }

  async createCampaign(
    userId: string,
    selectedPlatforms: CampaignPlatform[]
  ): Promise<Campaign> {
    // 1. Fetch active profile
    const profile = await this.profileRepo.findActiveByUserId(userId);
    if (!profile) {
      throw new ServiceError(
        "No audience profile found. Generate an audience profile first.",
        "NO_PROFILE"
      );
    }

    // 2. Fetch quiz response
    const quizResponse = await this.quizRepo.findLatestByUserId(userId);
    if (!quizResponse) {
      throw new ServiceError("No quiz response found.", "NO_QUIZ_RESPONSE");
    }

    const startTime = Date.now();

    try {
      // 3. Generate strategy via agent
      const strategyResult = await this.strategyAgent.generateCampaignStrategy(
        profile.profileData,
        quizResponse.responseData,
        selectedPlatforms
      );

      const durationMs = Date.now() - startTime;

      // 4. Create campaign record
      const campaign = await this.campaignRepo.create({
        userId,
        selectedPlatforms,
        audienceProfileId: profile.id,
        quizResponseId: quizResponse.id,
        name: strategyResult.strategy.campaignName,
        status: "strategy_complete",
        strategyData: strategyResult.strategy,
        totalTokensUsed: strategyResult.tokensUsed,
      });

      // 5. Create placeholder content rows
      await this.contentRepo.createMany(
        selectedPlatforms.map((platform) => ({
          campaignId: campaign.id,
          userId,
          platform,
        }))
      );

      // 6. Log agent run
      await this.agentRunRepo.log({
        userId,
        agentType: "campaign_strategy",
        inputData: {
          profileId: profile.id,
          quizResponseId: quizResponse.id,
          selectedPlatforms,
        },
        outputData: { campaignName: strategyResult.strategy.campaignName },
        modelUsed: strategyResult.modelUsed,
        tokensUsed: strategyResult.tokensUsed,
        durationMs,
        status: "success",
      });

      return campaign;
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      await this.agentRunRepo.log({
        userId,
        agentType: "campaign_strategy",
        inputData: { profileId: profile.id, selectedPlatforms },
        modelUsed: "claude-sonnet-4-20250514",
        durationMs,
        status: "failed",
        errorMessage,
      });

      throw new ServiceError(
        "Failed to generate campaign strategy. Please try again.",
        "AGENT_FAILED"
      );
    }
  }

  async generateCalendar(
    campaignId: string,
    userId: string
  ): Promise<import("@/types").CampaignCalendar> {
    const campaign = await this.campaignRepo.findById(campaignId, userId);
    if (!campaign) {
      throw new ServiceError("Campaign not found", "NOT_FOUND");
    }

    if (!campaign.canGenerateCalendar()) {
      throw new ServiceError(
        "Campaign strategy must be generated first",
        "INVALID_STATE"
      );
    }

    // Fetch audience profile
    if (!campaign.audienceProfileId) {
      throw new ServiceError("Audience profile not found", "NOT_FOUND");
    }
    const profile = await this.profileRepo.findById(campaign.audienceProfileId);
    if (!profile) {
      throw new ServiceError("Audience profile not found", "NOT_FOUND");
    }

    const startTime = Date.now();

    try {
      const calendarResult = await this.calendarAgent.generateCampaignCalendar(
        campaign.strategy!,
        profile.profileData
      );

      const durationMs = Date.now() - startTime;

      // Update campaign
      await this.campaignRepo.updateCalendar(
        campaignId,
        calendarResult.calendar,
        calendarResult.tokensUsed
      );

      // Insert calendar entries
      await this.calendarEntryRepo.createMany(
        calendarResult.calendar.entries.map((entry) => ({
          campaignId,
          userId,
          dayNumber: entry.dayNumber,
          platform: entry.platform,
          contentType: entry.contentType,
          title: entry.title,
          postingTime: entry.postingTime,
          pillar: entry.pillar,
          notes: entry.notes,
        }))
      );

      await this.agentRunRepo.log({
        userId,
        agentType: "campaign_calendar",
        inputData: { campaignId },
        outputData: { totalPosts: calendarResult.calendar.totalPosts },
        modelUsed: calendarResult.modelUsed,
        tokensUsed: calendarResult.tokensUsed,
        durationMs,
        status: "success",
      });

      return calendarResult.calendar;
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      await this.agentRunRepo.log({
        userId,
        agentType: "campaign_calendar",
        inputData: { campaignId },
        modelUsed: "claude-sonnet-4-20250514",
        durationMs,
        status: "failed",
        errorMessage,
      });

      throw new ServiceError(
        "Failed to generate campaign calendar. Please try again.",
        "AGENT_FAILED"
      );
    }
  }

  async generateContentBatch(
    campaignId: string,
    userId: string
  ): Promise<{
    completed: CampaignPlatform[];
    failed: CampaignPlatform[];
    remaining: CampaignPlatform[];
    isComplete: boolean;
  }> {
    const campaign = await this.campaignRepo.findById(campaignId, userId);
    if (!campaign) {
      throw new ServiceError("Campaign not found", "NOT_FOUND");
    }

    if (!campaign.canGenerateContent()) {
      throw new ServiceError(
        "Campaign calendar must be generated first",
        "INVALID_STATE"
      );
    }

    const allContent = await this.contentRepo.findByCampaignId(campaignId);
    const pendingContent = allContent.filter(
      (c) => c.isPending() || c.isFailed()
    );

    if (pendingContent.length === 0) {
      throw new ServiceError(
        "All platform content already generated",
        "NOTHING_TO_GENERATE"
      );
    }

    // Priority-sort pending platforms
    const strategy = campaign.strategy!;
    const platformsByPriority = strategy.platformAllocations
      .sort((a, b) => a.priorityOrder - b.priorityOrder)
      .map((p) => p.platform);

    const pendingPlatforms = pendingContent
      .map((c) => c.platform)
      .sort(
        (a, b) =>
          platformsByPriority.indexOf(a) - platformsByPriority.indexOf(b)
      );

    const batch = this.contentAgent.getNextBatch(pendingPlatforms);
    if (batch.length === 0) {
      throw new ServiceError("No platforms to generate", "EMPTY_BATCH");
    }

    // Mark batch as generating
    for (const platform of batch) {
      const contentRow = allContent.find((c) => c.platform === platform);
      if (contentRow) {
        await this.contentRepo.updateStatus(contentRow.id, "generating");
      }
    }

    // Update campaign status
    if (campaign.status !== "generating_content") {
      await this.campaignRepo.updateStatus(campaignId, "generating_content");
    }

    // Fetch dependencies
    if (!campaign.audienceProfileId || !campaign.quizResponseId) {
      throw new ServiceError("Profile or quiz not found", "NOT_FOUND");
    }
    const profile = await this.profileRepo.findById(campaign.audienceProfileId);
    const quizResponse = await this.quizRepo.findLatestByUserId(userId);

    if (!profile || !quizResponse) {
      throw new ServiceError("Profile or quiz not found", "NOT_FOUND");
    }

    const startTime = Date.now();

    try {
      const batchResult = await this.contentAgent.generatePlatformBatch(
        batch,
        strategy,
        profile.profileData,
        quizResponse.responseData
      );

      const durationMs = Date.now() - startTime;
      let totalTokensUsed = 0;

      // Update successful content
      for (const result of batchResult.results) {
        const contentRow = allContent.find(
          (c) => c.platform === result.platform
        );
        if (contentRow) {
          await this.contentRepo.updateContent(
            contentRow.id,
            result.content,
            result.tokensUsed
          );
          totalTokensUsed += result.tokensUsed;

          await this.agentRunRepo.log({
            userId,
            agentType: "campaign_content",
            inputData: { campaignId, platform: result.platform },
            outputData: { platform: result.platform },
            modelUsed: "claude-sonnet-4-20250514",
            tokensUsed: result.tokensUsed,
            durationMs: Math.floor(durationMs / batch.length),
            status: "success",
          });
        }
      }

      // Update failed content
      for (const err of batchResult.errors) {
        const contentRow = allContent.find((c) => c.platform === err.platform);
        if (contentRow) {
          await this.contentRepo.updateStatus(
            contentRow.id,
            "failed",
            err.error
          );

          await this.agentRunRepo.log({
            userId,
            agentType: "campaign_content",
            inputData: { campaignId, platform: err.platform },
            modelUsed: "claude-sonnet-4-20250514",
            durationMs: Math.floor(durationMs / batch.length),
            status: "failed",
            errorMessage: err.error,
          });
        }
      }

      // Update campaign completed platforms
      const completedPlatforms = [
        ...campaign.completedPlatforms,
        ...batchResult.results.map((r) => r.platform),
      ];

      await this.campaignRepo.updateCompletedPlatforms(
        campaignId,
        completedPlatforms,
        totalTokensUsed
      );

      // Check completion
      const updatedContent =
        await this.contentRepo.findByCampaignId(campaignId);
      const allComplete = updatedContent.every((c) => c.isComplete());

      if (allComplete) {
        await this.campaignRepo.updateStatus(campaignId, "complete");
      }

      const remainingPending = updatedContent.filter(
        (c) => c.isPending() || c.isFailed()
      );

      return {
        completed: batchResult.results.map((r) => r.platform),
        failed: batchResult.errors.map((e) => e.platform),
        remaining: remainingPending.map((c) => c.platform),
        isComplete: allComplete,
      };
    } catch (error) {
      // Mark batch as failed
      for (const platform of batch) {
        const contentRow = allContent.find((c) => c.platform === platform);
        if (contentRow) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          await this.contentRepo.updateStatus(
            contentRow.id,
            "failed",
            errorMessage
          );
        }
      }

      throw new ServiceError(
        "Failed to generate content batch. Please try again.",
        "AGENT_FAILED"
      );
    }
  }
}
