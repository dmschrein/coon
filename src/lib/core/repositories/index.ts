/**
 * Repository Layer - Barrel export and factory.
 */

export type {
  CampaignRepository,
  AudienceProfileRepository,
  CampaignContentRepository,
  QuizResponseRepository,
  CalendarEntryRepository,
  AgentRunRepository,
  AgentRunMetrics,
} from "./interfaces";

export { DrizzleCampaignRepository } from "./drizzle-campaign";
export { DrizzleAudienceProfileRepository } from "./drizzle-audience-profile";
export { DrizzleCampaignContentRepository } from "./drizzle-campaign-content";
export { DrizzleQuizResponseRepository } from "./drizzle-quiz-response";
export { DrizzleCalendarEntryRepository } from "./drizzle-calendar-entry";
export { DrizzleAgentRunRepository } from "./drizzle-agent-run";
