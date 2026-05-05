/**
 * DI Container - Simple dependency injection for services and repositories.
 *
 * Provides a singleton container that wires up production dependencies.
 * Services can be resolved in API routes without manual wiring.
 */

import { db } from "@/lib/db";
import {
  DrizzleCampaignRepository,
  DrizzleAudienceProfileRepository,
  DrizzleCampaignContentRepository,
  DrizzleQuizResponseRepository,
  DrizzleCalendarEntryRepository,
  DrizzleAgentRunRepository,
  DrizzleConnectedAccountRepository,
  DrizzleAnalyticsRepository,
  DrizzleEngagementRepository,
  DrizzlePlatformMemberRepository,
  DrizzleInboxRepository,
  DrizzleBlockedSenderRepository,
  DrizzleNotificationRepository,
  DrizzleRitualTemplateRepository,
} from "../repositories";
import { AudienceService } from "../services/audience-service";
import { CampaignService } from "../services/campaign-service";
import { PublishService } from "../services/publish-service";
import { AnalyticsService } from "../services/analytics-service";
import { EnrichmentService } from "../services/enrichment-service";
import { InboxService } from "../services/inbox-service";
import { RitualService } from "../services/ritual-service";
import { EventService } from "../services/event-service";
import { getAdapter } from "@/lib/services/social";
import {
  PluginRunner,
  TokenTrackingPlugin,
  DurationTrackingPlugin,
} from "../plugins/agent-plugin";
import { analyzeAudience } from "@/lib/agents/audience-analysis";
import { generateCampaignStrategy } from "@/lib/agents/campaign-strategy";
import { generateCampaignCalendar } from "@/lib/agents/campaign-calendar";
import {
  generatePlatformBatch,
  getNextBatch,
} from "@/lib/agents/campaign-content";
import { generateCampaignPlan } from "@/lib/agents/campaign-generator";
import { generateContentPiece } from "@/lib/agents/content-piece-generator";
import { checkCampaignCohesion } from "@/lib/agents/cohesion-checker";
import { analyzeFeedbackLoop } from "@/lib/agents/feedback-loop";
import { generateAnalyticsInsights } from "@/lib/agents/analytics-insights";
import {
  enrichContentWithMedia,
  isVisualPlatform,
} from "@/lib/agents/media-enrichment";
import { scoreContent } from "@/lib/agents/content-scoring";
import { optimizeContent } from "@/lib/agents/seo-optimization";
import { checkModeration } from "@/lib/agents/moderation-checker";
import { generateEventContent } from "@/lib/agents/campaign-content/event";

// ─── Singleton Instances ──────────────────────────────────────────────────────

let _container: Container | null = null;

class Container {
  // Repositories
  readonly campaignRepo: DrizzleCampaignRepository;
  readonly profileRepo: DrizzleAudienceProfileRepository;
  readonly contentRepo: DrizzleCampaignContentRepository;
  readonly quizRepo: DrizzleQuizResponseRepository;
  readonly calendarEntryRepo: DrizzleCalendarEntryRepository;
  readonly agentRunRepo: DrizzleAgentRunRepository;
  readonly connectedAccountRepo: DrizzleConnectedAccountRepository;
  readonly analyticsRepo: DrizzleAnalyticsRepository;
  readonly engagementRepo: DrizzleEngagementRepository;
  readonly platformMemberRepo: DrizzlePlatformMemberRepository;
  readonly inboxRepo: DrizzleInboxRepository;
  readonly blockedSenderRepo: DrizzleBlockedSenderRepository;
  readonly notificationRepo: DrizzleNotificationRepository;
  readonly ritualRepo: DrizzleRitualTemplateRepository;

  // Plugins
  readonly pluginRunner: PluginRunner;
  readonly tokenPlugin: TokenTrackingPlugin;
  readonly durationPlugin: DurationTrackingPlugin;

  // Services
  readonly audienceService: AudienceService;
  readonly campaignService: CampaignService;
  readonly publishService: PublishService;
  readonly analyticsService: AnalyticsService;
  readonly enrichmentService: EnrichmentService;
  readonly inboxService: InboxService;
  readonly ritualService: RitualService;
  readonly eventService: EventService;

  constructor(database: typeof db) {
    // Initialize repositories
    this.campaignRepo = new DrizzleCampaignRepository(database);
    this.profileRepo = new DrizzleAudienceProfileRepository(database);
    this.contentRepo = new DrizzleCampaignContentRepository(database);
    this.quizRepo = new DrizzleQuizResponseRepository(database);
    this.calendarEntryRepo = new DrizzleCalendarEntryRepository(database);
    this.agentRunRepo = new DrizzleAgentRunRepository(database);
    this.connectedAccountRepo = new DrizzleConnectedAccountRepository(database);
    this.analyticsRepo = new DrizzleAnalyticsRepository(database);
    this.engagementRepo = new DrizzleEngagementRepository(database);
    this.platformMemberRepo = new DrizzlePlatformMemberRepository(database);
    this.inboxRepo = new DrizzleInboxRepository(database);
    this.blockedSenderRepo = new DrizzleBlockedSenderRepository(database);
    this.notificationRepo = new DrizzleNotificationRepository(database);
    this.ritualRepo = new DrizzleRitualTemplateRepository(database);

    // Initialize plugins
    this.pluginRunner = new PluginRunner();
    this.tokenPlugin = new TokenTrackingPlugin();
    this.durationPlugin = new DurationTrackingPlugin();
    this.pluginRunner.register(this.tokenPlugin);
    this.pluginRunner.register(this.durationPlugin);

    // Initialize services
    this.audienceService = new AudienceService(
      this.profileRepo,
      this.quizRepo,
      this.agentRunRepo,
      { analyzeAudience },
      this.pluginRunner,
      {
        engagementRepo: this.engagementRepo,
        contentRepo: this.contentRepo,
        campaignRepo: this.campaignRepo,
        feedbackAgent: { analyzeFeedbackLoop },
      }
    );

    this.campaignService = new CampaignService(
      this.campaignRepo,
      this.profileRepo,
      this.quizRepo,
      this.contentRepo,
      this.calendarEntryRepo,
      this.agentRunRepo,
      { generateCampaignStrategy },
      { generateCampaignCalendar },
      { generatePlatformBatch, getNextBatch },
      { generateCampaignPlan },
      { checkCampaignCohesion },
      { generateContentPiece },
      this.pluginRunner
    );

    this.publishService = new PublishService(
      this.connectedAccountRepo,
      this.contentRepo,
      getAdapter
    );

    this.analyticsService = new AnalyticsService(
      this.analyticsRepo,
      this.campaignRepo,
      this.contentRepo,
      this.profileRepo,
      this.agentRunRepo,
      { generateAnalyticsInsights }
    );

    this.enrichmentService = new EnrichmentService(
      this.contentRepo,
      { enrichContentWithMedia, isVisualPlatform },
      { scoreContent },
      this.campaignRepo,
      { optimizeContent },
      this.engagementRepo,
      getAdapter,
      this.platformMemberRepo,
      this.notificationRepo
    );

    this.inboxService = new InboxService(
      this.inboxRepo,
      this.blockedSenderRepo,
      { checkModeration }
    );

    this.ritualService = new RitualService(
      this.ritualRepo,
      this.calendarEntryRepo,
      this.campaignRepo
    );

    this.eventService = new EventService(
      this.campaignRepo,
      this.contentRepo,
      this.profileRepo,
      this.agentRunRepo,
      { generateEventContent }
    );
  }
}

/**
 * Get the singleton DI container. Lazily created on first access.
 */
export function getContainer(): Container {
  if (!_container) {
    _container = new Container(db);
  }
  return _container;
}

/**
 * Reset the container (useful for testing).
 */
export function resetContainer(): void {
  _container = null;
}
