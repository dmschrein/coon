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
} from "../repositories";
import { AudienceService } from "../services/audience-service";
import { CampaignService } from "../services/campaign-service";
import { PublishService } from "../services/publish-service";
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
import { checkCampaignCohesion } from "@/lib/agents/cohesion-checker";

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

  // Plugins
  readonly pluginRunner: PluginRunner;
  readonly tokenPlugin: TokenTrackingPlugin;
  readonly durationPlugin: DurationTrackingPlugin;

  // Services
  readonly audienceService: AudienceService;
  readonly campaignService: CampaignService;
  readonly publishService: PublishService;

  constructor(database: typeof db) {
    // Initialize repositories
    this.campaignRepo = new DrizzleCampaignRepository(database);
    this.profileRepo = new DrizzleAudienceProfileRepository(database);
    this.contentRepo = new DrizzleCampaignContentRepository(database);
    this.quizRepo = new DrizzleQuizResponseRepository(database);
    this.calendarEntryRepo = new DrizzleCalendarEntryRepository(database);
    this.agentRunRepo = new DrizzleAgentRunRepository(database);
    this.connectedAccountRepo = new DrizzleConnectedAccountRepository(database);

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
      this.pluginRunner
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
      this.pluginRunner
    );

    this.publishService = new PublishService(
      this.connectedAccountRepo,
      this.contentRepo,
      getAdapter
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
