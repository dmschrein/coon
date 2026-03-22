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
} from "../repositories/interfaces";
import type { AudienceProfileEntity } from "../domain/audience-profile";
import type { PluginRunner } from "../plugins/agent-plugin";

interface AudienceAgent {
  analyzeAudience: (quizData: import("@/types").QuizResponse) => Promise<{
    profile: import("@/types").AudienceProfile;
    modelUsed: string;
    tokensUsed: number;
  }>;
}

export class AudienceService {
  constructor(
    private profileRepo: AudienceProfileRepository,
    private quizRepo: QuizResponseRepository,
    private agentRunRepo: AgentRunRepository,
    private agent: AudienceAgent,
    private pluginRunner?: PluginRunner
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
