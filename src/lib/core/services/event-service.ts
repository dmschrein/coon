/**
 * Event Service - Generates a 3-post promotion sequence for an event and
 * persists the posts as campaign_content rows.
 */

import type {
  CampaignRepository,
  CampaignContentRepository,
  AudienceProfileRepository,
  AgentRunRepository,
} from "../repositories/interfaces";
import type { CampaignPlatform } from "@/types";
import type { EventInput, EventPostType } from "@/lib/validations/event";
import type {
  EventAgentInput,
  generateEventContent,
} from "@/lib/agents/campaign-content/event";
import { createOrchestration } from "@/lib/orchestration";
import { ServiceError } from "./audience-service";

export const ANNOUNCEMENT_OFFSET_DAYS = 7;
export const REMINDER_OFFSET_DAYS = 1;
export const DAY_OF_OFFSET_HOURS = 2;

interface EventAgent {
  generateEventContent: typeof generateEventContent;
}

export interface EventScheduleEntry {
  type: EventPostType;
  scheduledFor: Date;
}

export function computeEventSchedule(
  eventDatetime: Date
): EventScheduleEntry[] {
  const t = eventDatetime.getTime();
  return [
    {
      type: "announcement",
      scheduledFor: new Date(t - ANNOUNCEMENT_OFFSET_DAYS * 86_400_000),
    },
    {
      type: "reminder",
      scheduledFor: new Date(t - REMINDER_OFFSET_DAYS * 86_400_000),
    },
    {
      type: "day_of",
      scheduledFor: new Date(t - DAY_OF_OFFSET_HOURS * 3_600_000),
    },
  ];
}

export class EventService {
  constructor(
    private campaignRepo: CampaignRepository,
    private contentRepo: CampaignContentRepository,
    private profileRepo: AudienceProfileRepository,
    private agentRunRepo: AgentRunRepository,
    private eventAgent: EventAgent
  ) {}

  async createEventSequence(
    campaignId: string,
    userId: string,
    input: EventInput
  ): Promise<{ contentIds: string[] }> {
    const campaign = await this.campaignRepo.findById(campaignId, userId);
    if (!campaign) {
      throw new ServiceError("Campaign not found", "NOT_FOUND");
    }

    const profile = await this.profileRepo.findActiveByUserId(userId);
    if (!profile) {
      throw new ServiceError(
        "No audience profile found. Generate an audience profile first.",
        "NO_PROFILE"
      );
    }

    const eventDatetime = new Date(input.eventDatetime);
    const schedule = computeEventSchedule(eventDatetime);

    const agentInput: EventAgentInput = {
      eventTitle: input.eventTitle,
      eventDescription: input.eventDescription,
      platform: input.platform as CampaignPlatform,
      eventDatetime: input.eventDatetime,
      audienceProfile: profile.profileData,
    };

    const startTime = Date.now();

    try {
      // Wrap the agent call in the orchestration stack:
      // AgentQueue (rate-limit + concurrency) -> CircuitBreaker (fail fast on
      // repeated upstream errors) -> retry-with-backoff is already inside the
      // agent via `withRetry`.
      const { queue, circuitBreaker } = createOrchestration();
      const result = await queue.enqueue({
        id: `event-${campaignId}-${Date.now()}`,
        agentType: "event_content",
        priority: 5,
        execute: () =>
          circuitBreaker.execute(() =>
            this.eventAgent.generateEventContent(agentInput)
          ),
      });

      // Map agent posts (typed by post.type) to scheduled rows.
      const scheduleByType = new Map(
        schedule.map((s) => [s.type, s.scheduledFor])
      );
      const rows = result.content.posts.map((post) => ({
        campaignId,
        userId,
        platform: input.platform as CampaignPlatform,
        body: post.text,
        scheduledFor: scheduleByType.get(post.type) ?? eventDatetime,
        status: "complete" as const,
        contentType: "event",
        eventTitle: input.eventTitle,
        eventDatetime,
        eventRsvpUrl: input.eventRsvpUrl,
      }));

      const contentIds = await this.contentRepo.createMany(rows);

      await this.agentRunRepo.log({
        userId,
        agentType: "event_content",
        inputData: {
          campaignId,
          eventTitle: input.eventTitle,
          platform: input.platform,
        },
        outputData: { contentIds },
        modelUsed: "claude-sonnet-4-20250514",
        tokensUsed: result.tokensUsed,
        durationMs: Date.now() - startTime,
        status: "success",
      });

      return { contentIds };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      await this.agentRunRepo.log({
        userId,
        agentType: "event_content",
        inputData: { campaignId, platform: input.platform },
        modelUsed: "claude-sonnet-4-20250514",
        durationMs: Date.now() - startTime,
        status: "failed",
        errorMessage,
      });

      if (error instanceof ServiceError) throw error;
      throw new ServiceError(
        "Failed to generate event sequence. Please try again.",
        "AGENT_FAILED"
      );
    }
  }
}
