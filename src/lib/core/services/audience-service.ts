/**
 * Audience Service - Orchestrates audience profile operations.
 *
 * Coordinates between agents, repositories, and plugins.
 * Testable via dependency injection.
 */

import type {
  AudienceProfileRepository,
  QuizResponseRepository,
  AgentRunRepository,
  CampaignRepository,
  CampaignContentRepository,
  EngagementRepository,
} from "../repositories/interfaces";
import type { AudienceProfileEntity } from "../domain/audience-profile";
import type { PluginRunner } from "../plugins/agent-plugin";
import type {
  AudienceProfileChange,
  FeedbackLoopInput,
  FeedbackLoopOutput,
  PostEngagementWithContext,
  ConfidenceLevel,
} from "@/types";
import { setNestedField } from "./profile-utils";

interface AudienceAgent {
  analyzeAudience: (quizData: import("@/types").QuizResponse) => Promise<{
    profile: import("@/types").AudienceProfile;
    modelUsed: string;
    tokensUsed: number;
  }>;
}

interface FeedbackLoopAgent {
  analyzeFeedbackLoop: (input: FeedbackLoopInput) => Promise<{
    result: FeedbackLoopOutput;
    modelUsed: string;
    tokensUsed: number;
  }>;
}

export interface FeedbackDeps {
  engagementRepo: EngagementRepository;
  contentRepo: CampaignContentRepository;
  campaignRepo: CampaignRepository;
  feedbackAgent: FeedbackLoopAgent;
}

export class AudienceService {
  constructor(
    private profileRepo: AudienceProfileRepository,
    private quizRepo: QuizResponseRepository,
    private agentRunRepo: AgentRunRepository,
    private agent: AudienceAgent,
    private pluginRunner?: PluginRunner,
    private feedbackDeps?: FeedbackDeps
  ) {}

  async getActiveProfile(
    userId: string
  ): Promise<AudienceProfileEntity | null> {
    return this.profileRepo.findActiveByUserId(userId);
  }

  async regenerateProfile(userId: string): Promise<AudienceProfileEntity> {
    // 1. Get latest quiz response
    const quizResponse = await this.quizRepo.findLatestByUserId(userId);
    if (!quizResponse) {
      throw new ServiceError(
        "No quiz response found. Complete the quiz first.",
        "NO_QUIZ_RESPONSE"
      );
    }

    const startTime = Date.now();

    // 2. Run plugin beforeExecution hook
    const context = this.pluginRunner
      ? {
          agentType: "audience_analysis",
          userId,
          input: quizResponse.responseData,
          startTime,
          metadata: {},
        }
      : null;

    if (this.pluginRunner && context) {
      await this.pluginRunner.runBeforeExecution(context);
    }

    try {
      // 3. Deactivate existing profiles
      await this.profileRepo.deactivateAllForUser(userId);

      // 4. Run the agent
      const result = await this.agent.analyzeAudience(
        quizResponse.responseData
      );
      const durationMs = Date.now() - startTime;

      // 5. Save the new profile
      const newProfile = await this.profileRepo.create({
        userId,
        quizResponseId: quizResponse.id,
        profileData: result.profile,
      });

      // 6. Log the run
      await this.agentRunRepo.log({
        userId,
        agentType: "audience_analysis",
        inputData: quizResponse.responseData,
        outputData: result.profile,
        modelUsed: result.modelUsed,
        tokensUsed: result.tokensUsed,
        durationMs,
        status: "success",
      });

      // 7. Run plugin afterExecution hook
      if (this.pluginRunner && context) {
        await this.pluginRunner.runAfterExecution(
          context,
          result.profile,
          result.tokensUsed
        );
      }

      return newProfile;
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const err = error instanceof Error ? error : new Error(String(error));

      await this.agentRunRepo.log({
        userId,
        agentType: "audience_analysis",
        inputData: quizResponse.responseData,
        modelUsed: "claude-sonnet-4-20250514",
        durationMs,
        status: "failed",
        errorMessage: err.message,
      });

      if (this.pluginRunner && context) {
        await this.pluginRunner.runOnError(context, err);
      }

      throw new ServiceError(
        "Failed to generate audience profile. Please try again.",
        "AGENT_FAILED"
      );
    }
  }

  async proposeFeedbackChanges(userId: string): Promise<FeedbackLoopOutput> {
    const profile = await this.profileRepo.findActiveByUserId(userId);
    if (!profile) {
      throw new ServiceError("No audience profile found.", "NO_PROFILE");
    }
    if (!this.feedbackDeps) {
      throw new ServiceError("Feedback loop not configured.", "NOT_CONFIGURED");
    }

    const campaigns = await this.feedbackDeps.campaignRepo.findByUserId(userId);
    if (campaigns.length === 0) {
      throw new ServiceError("No campaigns found.", "NO_CAMPAIGNS");
    }

    const allContent = (
      await Promise.all(
        campaigns.map((c) =>
          this.feedbackDeps!.contentRepo.findByCampaignId(c.id)
        )
      )
    ).flat();

    const engagementData: PostEngagementWithContext[] = [];
    for (const content of allContent) {
      const engagements =
        await this.feedbackDeps.engagementRepo.getEngagementByContentId(
          content.id
        );
      for (const e of engagements) {
        engagementData.push({
          contentId: content.id,
          platform: content.platform,
          pillar: content.pillar,
          title: content.title,
          likes: e.likes,
          comments: e.comments,
          shares: e.shares,
          reach: e.reach,
          impressions: e.impressions,
          engagementRate: e.engagementRate ? parseFloat(e.engagementRate) : 0,
          scheduledFor: content.scheduledFor,
        });
      }
    }

    if (engagementData.length < 5) {
      throw new ServiceError(
        "Not enough engagement data (minimum 5 posts).",
        "INSUFFICIENT_DATA"
      );
    }

    const contentPillars = (profile.profileData.contentPillars ?? []).map(
      (p) => p.name
    );

    const startTime = Date.now();
    try {
      const agentResult =
        await this.feedbackDeps.feedbackAgent.analyzeFeedbackLoop({
          engagementData,
          currentAudienceProfile: profile.profileData,
          contentPillars,
        });

      const durationMs = Date.now() - startTime;
      await this.agentRunRepo.log({
        userId,
        agentType: "feedback_loop",
        inputData: { engagementCount: engagementData.length },
        outputData: agentResult.result,
        modelUsed: agentResult.modelUsed,
        tokensUsed: agentResult.tokensUsed,
        durationMs,
        status: "success",
      });

      return agentResult.result;
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const err = error instanceof Error ? error : new Error(String(error));
      await this.agentRunRepo.log({
        userId,
        agentType: "feedback_loop",
        modelUsed: "claude-sonnet-4-20250514",
        durationMs,
        status: "failed",
        errorMessage: err.message,
      });
      throw new ServiceError(
        "Failed to analyze feedback. Please try again.",
        "AGENT_FAILED"
      );
    }
  }

  async applyFeedbackChanges(
    userId: string,
    changes: AudienceProfileChange[]
  ): Promise<AudienceProfileEntity> {
    const profile = await this.profileRepo.findActiveByUserId(userId);
    if (!profile) {
      throw new ServiceError("No audience profile found.", "NO_PROFILE");
    }

    const updatedData = JSON.parse(JSON.stringify(profile.profileData));

    for (const change of changes) {
      setNestedField(updatedData, change.field, change.newValue);
    }

    const newConfidence: ConfidenceLevel =
      profile.confidenceLevel === "quiz_based"
        ? "data_informed"
        : "data_validated";

    return this.profileRepo.updateProfileData(
      profile.id,
      updatedData,
      newConfidence
    );
  }
}

export class ServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = "ServiceError";
  }
}
