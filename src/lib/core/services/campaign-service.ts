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
  CampaignGoal,
  CampaignDuration,
  CampaignGeneratorOutput,
  ContentApprovalStatus,
  ContentPillar,
} from "@/types";
import type {
  CohesionCheckInput,
  CohesionCheckResult,
} from "@/lib/agents/cohesion-checker";
import type {
  ContentBrief,
  ContentPieceContext,
} from "@/lib/agents/content-piece-generator";
import type { ContentPieceOutput } from "@/lib/validations/content-piece";
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

interface CampaignGeneratorAgent {
  generateCampaignPlan: (input: {
    profile: AudienceProfile;
    quiz: QuizResponse;
    name: string;
    goal: CampaignGoal;
    topic: string;
    platforms: CampaignPlatform[];
    duration: CampaignDuration;
    frequencyConfig: Record<string, number>;
  }) => Promise<{
    output: CampaignGeneratorOutput;
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

interface CohesionCheckerAgent {
  checkCampaignCohesion: (input: CohesionCheckInput) => Promise<{
    result: CohesionCheckResult;
    modelUsed: string;
    tokensUsed: number;
  }>;
}

interface ContentPieceAgent {
  generateContentPiece: (
    brief: ContentBrief,
    context: ContentPieceContext
  ) => Promise<{
    output: ContentPieceOutput;
    modelUsed: string;
    tokensUsed: number;
  }>;
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
    private campaignGeneratorAgent: CampaignGeneratorAgent,
    private cohesionCheckerAgent?: CohesionCheckerAgent,
    private contentPieceAgent?: ContentPieceAgent,
    private pluginRunner?: PluginRunner
  ) {}

  private durationToWeeks(duration: CampaignDuration | null): number {
    const map: Record<string, number> = {
      "1-week": 1,
      "2-weeks": 2,
      "4-weeks": 4,
      "8-weeks": 8,
      "12-weeks": 12,
    };
    return duration ? (map[duration] ?? 4) : 4;
  }

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

  async createDraftCampaign(
    userId: string,
    input: {
      name: string;
      goal: CampaignGoal;
      topic: string;
      platforms: CampaignPlatform[];
      duration: CampaignDuration;
      frequencyConfig: Record<string, number>;
    }
  ): Promise<Campaign> {
    const profile = await this.profileRepo.findActiveByUserId(userId);
    if (!profile) {
      throw new ServiceError(
        "No audience profile found. Generate an audience profile first.",
        "NO_PROFILE"
      );
    }

    const quizResponse = await this.quizRepo.findLatestByUserId(userId);
    if (!quizResponse) {
      throw new ServiceError("No quiz response found.", "NO_QUIZ_RESPONSE");
    }

    const campaign = await this.campaignRepo.create({
      userId,
      selectedPlatforms: input.platforms,
      audienceProfileId: profile.id,
      quizResponseId: quizResponse.id,
      name: input.name,
      status: "draft",
      strategyData: null,
      totalTokensUsed: 0,
      goal: input.goal,
      topic: input.topic,
      duration: input.duration,
      frequencyConfig: input.frequencyConfig,
    });

    return campaign;
  }

  async generatePlan(
    campaignId: string,
    userId: string
  ): Promise<CampaignGeneratorOutput> {
    const campaign = await this.campaignRepo.findById(campaignId, userId);
    if (!campaign) {
      throw new ServiceError("Campaign not found", "NOT_FOUND");
    }

    if (!campaign.canGenerateStrategy()) {
      throw new ServiceError(
        "Campaign must be in draft or strategy_pending status",
        "INVALID_STATE"
      );
    }

    const profile = await this.profileRepo.findActiveByUserId(userId);
    if (!profile) {
      throw new ServiceError("No audience profile found", "NO_PROFILE");
    }

    const quizResponse = await this.quizRepo.findLatestByUserId(userId);
    if (!quizResponse) {
      throw new ServiceError("No quiz response found", "NO_QUIZ_RESPONSE");
    }

    const startTime = Date.now();

    try {
      const result = await this.campaignGeneratorAgent.generateCampaignPlan({
        profile: profile.profileData,
        quiz: quizResponse.responseData,
        name: campaign.name ?? "Untitled Campaign",
        goal: campaign.goal!,
        topic: campaign.topic!,
        platforms: campaign.selectedPlatforms,
        duration: campaign.duration!,
        frequencyConfig: campaign.frequencyConfig!,
      });

      const durationMs = Date.now() - startTime;

      await this.campaignRepo.updatePlan(
        campaignId,
        result.output.strategySummary,
        result.output.contentPillars,
        result.tokensUsed
      );

      // Create content rows from the plan
      const startDate = new Date();
      await this.contentRepo.createMany(
        result.output.contentPlan.map((item) => ({
          campaignId,
          userId,
          platform: item.platform,
          pillar: item.pillar,
          title: item.title,
          scheduledFor: new Date(
            startDate.getTime() + (item.scheduledDay - 1) * 24 * 60 * 60 * 1000
          ),
        }))
      );

      await this.agentRunRepo.log({
        userId,
        agentType: "campaign_strategy",
        inputData: { campaignId },
        outputData: {
          pillarsCount: result.output.contentPillars.length,
          contentPlanCount: result.output.contentPlan.length,
        },
        modelUsed: result.modelUsed,
        tokensUsed: result.tokensUsed,
        durationMs,
        status: "success",
      });

      return result.output;
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      await this.agentRunRepo.log({
        userId,
        agentType: "campaign_strategy",
        inputData: { campaignId },
        modelUsed: "claude-sonnet-4-20250514",
        durationMs,
        status: "failed",
        errorMessage,
      });

      throw new ServiceError(
        "Failed to generate campaign plan. Please try again.",
        "AGENT_FAILED"
      );
    }
  }

  async generateFullCampaign(
    campaignId: string,
    userId: string
  ): Promise<void> {
    if (!this.contentPieceAgent) {
      throw new ServiceError(
        "Content piece agent not configured",
        "NOT_CONFIGURED"
      );
    }

    const campaign = await this.campaignRepo.findById(campaignId, userId);
    if (!campaign) {
      throw new ServiceError("Campaign not found", "NOT_FOUND");
    }

    if (!campaign.canRunFullGeneration()) {
      throw new ServiceError(
        "Campaign must be in draft status to generate",
        "INVALID_STATE"
      );
    }

    const profile = await this.profileRepo.findActiveByUserId(userId);
    if (!profile) {
      throw new ServiceError("No audience profile found", "NO_PROFILE");
    }

    const quizResponse = await this.quizRepo.findLatestByUserId(userId);
    if (!quizResponse) {
      throw new ServiceError("No quiz response found", "NO_QUIZ_RESPONSE");
    }

    // Mark as generating
    await this.campaignRepo.updateStatus(campaignId, "generating");

    // --- Phase A: Strategy Generation ---
    const strategyStart = Date.now();
    let planOutput: CampaignGeneratorOutput;

    try {
      const result = await this.campaignGeneratorAgent.generateCampaignPlan({
        profile: profile.profileData,
        quiz: quizResponse.responseData,
        name: campaign.name ?? "Untitled Campaign",
        goal: campaign.goal!,
        topic: campaign.topic!,
        platforms: campaign.selectedPlatforms,
        duration: campaign.duration!,
        frequencyConfig: campaign.frequencyConfig!,
      });

      planOutput = result.output;
      const durationMs = Date.now() - strategyStart;

      await this.campaignRepo.updatePlan(
        campaignId,
        result.output.strategySummary,
        result.output.contentPillars,
        result.tokensUsed
      );

      // Create content rows from the plan
      const startDate = new Date();
      await this.contentRepo.createMany(
        result.output.contentPlan.map((item) => ({
          campaignId,
          userId,
          platform: item.platform,
          pillar: item.pillar,
          title: item.title,
          scheduledFor: new Date(
            startDate.getTime() + (item.scheduledDay - 1) * 24 * 60 * 60 * 1000
          ),
        }))
      );

      await this.agentRunRepo.log({
        userId,
        agentType: "campaign_strategy",
        inputData: { campaignId, action: "full_generation_strategy" },
        outputData: {
          pillarsCount: result.output.contentPillars.length,
          contentPlanCount: result.output.contentPlan.length,
        },
        modelUsed: result.modelUsed,
        tokensUsed: result.tokensUsed,
        durationMs,
        status: "success",
      });
    } catch (error) {
      const durationMs = Date.now() - strategyStart;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      await this.agentRunRepo.log({
        userId,
        agentType: "campaign_strategy",
        inputData: { campaignId, action: "full_generation_strategy" },
        modelUsed: "claude-sonnet-4-20250514",
        durationMs,
        status: "failed",
        errorMessage,
      });

      await this.campaignRepo.updateStatus(campaignId, "failed");
      return;
    }

    // --- Phase B: Content Piece Generation ---
    const allContent = await this.contentRepo.findByCampaignId(campaignId);
    const pendingContent = allContent.filter((c) => c.isPending());

    const pieceContext: ContentPieceContext = {
      audienceProfile: profile.profileData,
      strategySummary: planOutput.strategySummary,
      contentPillars: planOutput.contentPillars,
      campaignGoal: campaign.goal ?? "build-awareness",
      campaignTopic: campaign.topic ?? "",
    };

    const BATCH_SIZE = 3;
    let totalTokensUsed = 0;

    for (let i = 0; i < pendingContent.length; i += BATCH_SIZE) {
      const batch = pendingContent.slice(i, i + BATCH_SIZE);

      // Mark batch as generating
      for (const row of batch) {
        await this.contentRepo.updateStatus(row.id, "generating");
      }

      const results = await Promise.allSettled(
        batch.map(async (row) => {
          const brief: ContentBrief = {
            platform: row.platform,
            contentType:
              planOutput.contentPlan.find(
                (p) => p.title === row.title && p.platform === row.platform
              )?.contentType ?? "educational",
            pillar: row.pillar ?? planOutput.contentPillars[0]?.theme ?? "",
            title: row.title ?? "Untitled",
            targetCommunity: undefined,
          };

          const pieceStart = Date.now();
          const result = await this.contentPieceAgent!.generateContentPiece(
            brief,
            pieceContext
          );

          const durationMs = Date.now() - pieceStart;

          await this.contentRepo.updateContentPiece(row.id, {
            body: result.output.body,
            hashtags: result.output.hashtags,
            mediaSuggestions: result.output.mediaSuggestions,
            aiConfidenceScore: result.output.confidenceScore,
            targetCommunity: result.output.targetCommunity,
            contentData: result.output,
            tokensUsed: result.tokensUsed,
          });

          await this.agentRunRepo.log({
            userId,
            agentType: "content_piece_generation",
            inputData: {
              campaignId,
              contentId: row.id,
              platform: row.platform,
            },
            outputData: { platform: row.platform, title: row.title },
            modelUsed: result.modelUsed,
            tokensUsed: result.tokensUsed,
            durationMs,
            status: "success",
          });

          totalTokensUsed += result.tokensUsed;
          return result;
        })
      );

      // Handle failures
      for (let j = 0; j < results.length; j++) {
        const outcome = results[j];
        if (outcome.status === "rejected") {
          const row = batch[j];
          const errorMessage =
            outcome.reason instanceof Error
              ? outcome.reason.message
              : String(outcome.reason);

          await this.contentRepo.updateStatus(row.id, "failed", errorMessage);

          await this.agentRunRepo.log({
            userId,
            agentType: "content_piece_generation",
            inputData: {
              campaignId,
              contentId: row.id,
              platform: row.platform,
            },
            modelUsed: "claude-sonnet-4-20250514",
            status: "failed",
            errorMessage,
          });
        }
      }
    }

    // Update campaign tokens and final status
    if (totalTokensUsed > 0) {
      await this.campaignRepo.updateCompletedPlatforms(
        campaignId,
        campaign.selectedPlatforms,
        totalTokensUsed
      );
    }

    await this.campaignRepo.updateStatus(campaignId, "complete");
  }

  async updateContentApproval(
    contentId: string,
    approvalStatus: ContentApprovalStatus
  ): Promise<void> {
    await this.contentRepo.updateApprovalStatus(contentId, approvalStatus);
  }

  async bulkUpdateApproval(
    contentIds: string[],
    approvalStatus: ContentApprovalStatus
  ): Promise<void> {
    await this.contentRepo.bulkUpdateApprovalStatus(contentIds, approvalStatus);
  }

  async checkCohesion(
    campaignId: string,
    userId: string
  ): Promise<CohesionCheckResult> {
    if (!this.cohesionCheckerAgent) {
      throw new ServiceError(
        "Cohesion checker not configured",
        "NOT_CONFIGURED"
      );
    }

    const campaign = await this.campaignRepo.findById(campaignId, userId);
    if (!campaign) {
      throw new ServiceError("Campaign not found", "NOT_FOUND");
    }

    const content = await this.contentRepo.findByCampaignId(campaignId);

    const startTime = Date.now();

    try {
      const { result, modelUsed, tokensUsed } =
        await this.cohesionCheckerAgent.checkCampaignCohesion({
          campaignName: campaign.name ?? "Untitled",
          strategySummary: campaign.strategySummary ?? "",
          contentPillars: (campaign.contentPillars ?? []).map((p) => ({
            theme: p.theme,
            description: p.description,
          })),
          contentPieces: content.map((c) => ({
            id: c.id,
            platform: c.platform,
            title: c.title,
            pillar: c.pillar,
            body: c.body,
          })),
        });

      const durationMs = Date.now() - startTime;

      await this.agentRunRepo.log({
        userId,
        agentType: "campaign_content",
        inputData: { campaignId, action: "cohesion_check" },
        outputData: { score: result.score },
        modelUsed,
        tokensUsed,
        durationMs,
        status: "success",
      });

      return result;
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      await this.agentRunRepo.log({
        userId,
        agentType: "campaign_content",
        inputData: { campaignId, action: "cohesion_check" },
        modelUsed: "claude-sonnet-4-20250514",
        durationMs,
        status: "failed",
        errorMessage,
      });

      throw new ServiceError(
        "Failed to check campaign cohesion. Please try again.",
        "AGENT_FAILED"
      );
    }
  }

  async updateCampaign(
    campaignId: string,
    userId: string,
    data: {
      name?: string;
      goal?: string;
      topic?: string;
      duration?: string;
      platforms?: string[];
      frequencyConfig?: Record<string, number>;
    }
  ): Promise<Campaign> {
    const campaign = await this.campaignRepo.findById(campaignId, userId);
    if (!campaign) {
      throw new ServiceError("Campaign not found", "NOT_FOUND");
    }

    const updated = await this.campaignRepo.updateFields(campaignId, {
      name: data.name,
      goal: data.goal,
      topic: data.topic,
      duration: data.duration,
      selectedPlatforms: data.platforms,
      frequencyConfig: data.frequencyConfig,
    });

    if (!updated) {
      throw new ServiceError("Failed to update campaign", "INTERNAL_ERROR");
    }

    return updated;
  }

  async deleteCampaign(campaignId: string, userId: string): Promise<void> {
    const campaign = await this.campaignRepo.findById(campaignId, userId);
    if (!campaign) {
      throw new ServiceError("Campaign not found", "NOT_FOUND");
    }

    await this.campaignRepo.delete(campaignId);
  }

  async deleteContent(contentId: string, userId: string): Promise<void> {
    const content = await this.contentRepo.findById(contentId);
    if (!content) {
      throw new ServiceError("Content not found", "NOT_FOUND");
    }
    if (content.userId !== userId) {
      throw new ServiceError("Unauthorized", "UNAUTHORIZED");
    }
    await this.contentRepo.delete(contentId);
  }

  async scheduleContent(
    contentId: string,
    userId: string,
    scheduledFor: Date
  ): Promise<void> {
    const content = await this.contentRepo.findById(contentId);
    if (!content) {
      throw new ServiceError("Content not found", "NOT_FOUND");
    }
    if (content.userId !== userId) {
      throw new ServiceError("Unauthorized", "UNAUTHORIZED");
    }
    await this.contentRepo.updateSchedule(contentId, scheduledFor);
  }

  async bulkScheduleContent(
    contentIds: string[],
    userId: string,
    scheduledFor: Date
  ): Promise<void> {
    await this.contentRepo.bulkUpdateSchedule(contentIds, scheduledFor);
  }

  async regenerateContent(
    campaignId: string,
    contentId: string,
    userId: string
  ): Promise<void> {
    if (!this.contentPieceAgent) {
      throw new ServiceError(
        "Content piece agent not configured",
        "NOT_CONFIGURED"
      );
    }

    const campaign = await this.campaignRepo.findById(campaignId, userId);
    if (!campaign) {
      throw new ServiceError("Campaign not found", "NOT_FOUND");
    }

    const content = await this.contentRepo.findById(contentId);
    if (!content) {
      throw new ServiceError("Content not found", "NOT_FOUND");
    }

    // Mark as generating
    await this.contentRepo.updateStatus(contentId, "generating");

    // Build context for content piece agent
    if (!campaign.audienceProfileId) {
      throw new ServiceError("Audience profile not found", "NOT_FOUND");
    }
    const profile = await this.profileRepo.findById(campaign.audienceProfileId);
    if (!profile) {
      throw new ServiceError("Audience profile not found", "NOT_FOUND");
    }

    const strategy: CampaignStrategy = campaign.strategy ?? {
      campaignName: campaign.name ?? "Campaign",
      theme: campaign.topic ?? "",
      goal: campaign.goal ?? "",
      targetOutcome: "",
      timelineWeeks: this.durationToWeeks(campaign.duration),
      messagingFramework: {
        coreMessage: campaign.strategySummary ?? "",
        supportingMessages: [],
        toneGuidelines: "",
        keyPhrases: [],
        avoidPhrases: [],
      },
      platformAllocations: campaign.selectedPlatforms.map((p, i) => ({
        platform: p,
        role: "content",
        contentFocus: "",
        frequencySuggestion: `${campaign.frequencyConfig?.[p] ?? 3}x/week`,
        priorityOrder: i + 1,
      })),
      contentPillars: campaign.contentPillars ?? [],
      audienceHooks: [],
    };

    const brief: ContentBrief = {
      platform: content.platform,
      pillar: content.pillar ?? "",
      title: content.title ?? "",
      contentType: "post",
    };

    const context: ContentPieceContext = {
      audienceProfile: profile.profileData,
      strategySummary: campaign.strategySummary ?? strategy.theme,
      contentPillars: strategy.contentPillars,
      campaignGoal: campaign.goal ?? strategy.goal,
      campaignTopic: campaign.topic ?? strategy.theme,
    };

    const startTime = Date.now();

    try {
      const { output, modelUsed, tokensUsed } =
        await this.contentPieceAgent.generateContentPiece(brief, context);

      const durationMs = Date.now() - startTime;

      await this.contentRepo.updateContentPiece(contentId, {
        body: output.body,
        hashtags: output.hashtags ?? [],
        mediaSuggestions: output.mediaSuggestions ?? null,
        aiConfidenceScore: output.confidenceScore ?? 0.7,
        targetCommunity: output.targetCommunity ?? "",
        contentData: output,
        tokensUsed,
      });

      await this.agentRunRepo.log({
        userId,
        agentType: "content_piece_generation",
        inputData: { campaignId, contentId, action: "regenerate" },
        outputData: { platform: content.platform },
        modelUsed,
        tokensUsed,
        durationMs,
        status: "success",
      });
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      await this.contentRepo.updateStatus(contentId, "failed", errorMessage);

      await this.agentRunRepo.log({
        userId,
        agentType: "content_piece_generation",
        inputData: { campaignId, contentId, action: "regenerate" },
        modelUsed: "claude-sonnet-4-20250514",
        durationMs,
        status: "failed",
        errorMessage,
      });

      throw new ServiceError(
        "Failed to regenerate content. Please try again.",
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
      // Build strategy for the calendar agent — use existing strategyData or
      // synthesize a minimal one from the new plan fields.
      const strategyForCalendar: CampaignStrategy = campaign.strategy ?? {
        campaignName: campaign.name ?? "Campaign",
        theme: campaign.topic ?? "",
        goal: campaign.goal ?? "",
        targetOutcome: "",
        timelineWeeks: this.durationToWeeks(campaign.duration),
        messagingFramework: {
          coreMessage: campaign.strategySummary ?? "",
          supportingMessages: [],
          toneGuidelines: "",
          keyPhrases: [],
          avoidPhrases: [],
        },
        platformAllocations: campaign.selectedPlatforms.map((p, i) => ({
          platform: p,
          role: "content",
          contentFocus: "",
          frequencySuggestion: `${campaign.frequencyConfig?.[p] ?? 3}x/week`,
          priorityOrder: i + 1,
        })),
        contentPillars: campaign.contentPillars ?? [],
        audienceHooks: [],
      };

      const calendarResult = await this.calendarAgent.generateCampaignCalendar(
        strategyForCalendar,
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

    // Build strategy — use existing or synthesize from plan fields
    const strategy: CampaignStrategy = campaign.strategy ?? {
      campaignName: campaign.name ?? "Campaign",
      theme: campaign.topic ?? "",
      goal: campaign.goal ?? "",
      targetOutcome: "",
      timelineWeeks: this.durationToWeeks(campaign.duration),
      messagingFramework: {
        coreMessage: campaign.strategySummary ?? "",
        supportingMessages: [],
        toneGuidelines: "",
        keyPhrases: [],
        avoidPhrases: [],
      },
      platformAllocations: campaign.selectedPlatforms.map((p, i) => ({
        platform: p,
        role: "content",
        contentFocus: "",
        frequencySuggestion: `${campaign.frequencyConfig?.[p] ?? 3}x/week`,
        priorityOrder: i + 1,
      })),
      contentPillars: campaign.contentPillars ?? [],
      audienceHooks: [],
    };

    // Priority-sort pending platforms
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
