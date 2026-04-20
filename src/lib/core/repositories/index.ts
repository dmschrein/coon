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
  ConnectedAccountRepository,
  AnalyticsRepository,
  EngagementRepository,
  PostEngagementRow,
  PlatformMemberRepository,
  PlatformMemberRow,
} from "./interfaces";

export { DrizzleCampaignRepository } from "./drizzle-campaign";
export { DrizzleAudienceProfileRepository } from "./drizzle-audience-profile";
export { DrizzleCampaignContentRepository } from "./drizzle-campaign-content";
export { DrizzleQuizResponseRepository } from "./drizzle-quiz-response";
export { DrizzleCalendarEntryRepository } from "./drizzle-calendar-entry";
export { DrizzleAgentRunRepository } from "./drizzle-agent-run";
export { DrizzleConnectedAccountRepository } from "./drizzle-connected-account";
export { DrizzleAnalyticsRepository } from "./drizzle-analytics";
export { DrizzleEngagementRepository } from "./drizzle-engagement";
export { DrizzlePlatformMemberRepository } from "./drizzle-platform-member";
