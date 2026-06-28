import { describe, it, expect, vi, beforeEach } from "vitest";
import { AudienceService, ServiceError } from "../audience-service";
import type { FeedbackDeps } from "../audience-service";
import { AudienceProfileEntity } from "../../domain/audience-profile";
import { Campaign } from "../../domain/campaign";
import { CampaignContentEntity } from "../../domain/content";
import { audienceProfileFixture } from "@/lib/agents/__fixtures__/audience";
import { quizFixture } from "@/lib/agents/__fixtures__/quiz";
import type {
  AudienceProfileRepository,
  QuizResponseRepository,
  AgentRunRepository,
  CampaignRepository,
  CampaignContentRepository,
  EngagementRepository,
  PostEngagementRow,
} from "../../repositories/interfaces";
import type { AudienceProfileChange } from "@/types";

type MockRepo<T> = { [K in keyof T]: ReturnType<typeof vi.fn> };

function profileEntity(
  confidence: "quiz_based" | "data_informed" = "quiz_based"
) {
  return new AudienceProfileEntity(
    "prof-1",
    "user-1",
    "quiz-1",
    JSON.parse(JSON.stringify(audienceProfileFixture)),
    confidence,
    null,
    true,
    new Date()
  );
}

function engagementRow(
  overrides: Partial<PostEngagementRow> = {}
): PostEngagementRow {
  return {
    id: "e-1",
    campaignContentId: "c-1",
    platform: "twitter",
    platformPostId: "p-1",
    likes: 10,
    comments: 2,
    shares: 1,
    reach: 100,
    impressions: 200,
    engagementRate: "5.5",
    recordedAt: new Date(),
    createdAt: new Date(),
    ...overrides,
  };
}

describe("AudienceService.regenerateProfile — plugin hooks", () => {
  let profileRepo: MockRepo<AudienceProfileRepository>;
  let quizRepo: MockRepo<QuizResponseRepository>;
  let agentRunRepo: MockRepo<AgentRunRepository>;
  let agent: { analyzeAudience: ReturnType<typeof vi.fn> };
  let pluginRunner: {
    runBeforeExecution: ReturnType<typeof vi.fn>;
    runAfterExecution: ReturnType<typeof vi.fn>;
    runOnError: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    profileRepo = {
      findActiveByUserId: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      deactivateAllForUser: vi.fn(),
      updateProfileData: vi.fn(),
    };
    quizRepo = { findLatestByUserId: vi.fn() };
    agentRunRepo = { log: vi.fn(), getMetrics: vi.fn() };
    agent = { analyzeAudience: vi.fn() };
    pluginRunner = {
      runBeforeExecution: vi.fn(),
      runAfterExecution: vi.fn(),
      runOnError: vi.fn(),
    };
  });

  it("runs before/after plugin hooks on success", async () => {
    quizRepo.findLatestByUserId.mockResolvedValue({
      id: "quiz-1",
      responseData: quizFixture,
    });
    agent.analyzeAudience.mockResolvedValue({
      profile: audienceProfileFixture,
      modelUsed: "claude",
      tokensUsed: 100,
    });
    profileRepo.create.mockResolvedValue(profileEntity());

    const service = new AudienceService(
      profileRepo as unknown as AudienceProfileRepository,
      quizRepo as unknown as QuizResponseRepository,
      agentRunRepo as unknown as AgentRunRepository,
      agent as never,
      pluginRunner as never
    );

    await service.regenerateProfile("user-1");

    expect(pluginRunner.runBeforeExecution).toHaveBeenCalled();
    expect(pluginRunner.runAfterExecution).toHaveBeenCalledWith(
      expect.objectContaining({ agentType: "audience_analysis" }),
      audienceProfileFixture,
      100
    );
    expect(pluginRunner.runOnError).not.toHaveBeenCalled();
  });

  it("runs onError plugin hook when agent fails", async () => {
    quizRepo.findLatestByUserId.mockResolvedValue({
      id: "quiz-1",
      responseData: quizFixture,
    });
    agent.analyzeAudience.mockRejectedValue(new Error("boom"));

    const service = new AudienceService(
      profileRepo as unknown as AudienceProfileRepository,
      quizRepo as unknown as QuizResponseRepository,
      agentRunRepo as unknown as AgentRunRepository,
      agent as never,
      pluginRunner as never
    );

    await expect(service.regenerateProfile("user-1")).rejects.toThrow(
      ServiceError
    );
    expect(pluginRunner.runOnError).toHaveBeenCalled();
  });
});

describe("AudienceService.proposeFeedbackChanges", () => {
  let profileRepo: MockRepo<AudienceProfileRepository>;
  let quizRepo: MockRepo<QuizResponseRepository>;
  let agentRunRepo: MockRepo<AgentRunRepository>;
  let campaignRepo: MockRepo<CampaignRepository>;
  let contentRepo: MockRepo<CampaignContentRepository>;
  let engagementRepo: MockRepo<EngagementRepository>;
  let feedbackAgent: { analyzeFeedbackLoop: ReturnType<typeof vi.fn> };
  let feedbackDeps: FeedbackDeps;

  function buildService(deps?: FeedbackDeps) {
    return new AudienceService(
      profileRepo as unknown as AudienceProfileRepository,
      quizRepo as unknown as QuizResponseRepository,
      agentRunRepo as unknown as AgentRunRepository,
      { analyzeAudience: vi.fn() } as never,
      undefined,
      deps
    );
  }

  function content(id: string) {
    return new CampaignContentEntity(
      id,
      "camp-1",
      "user-1",
      "twitter",
      "complete",
      null,
      null,
      null,
      new Date(),
      "approved",
      "Title",
      "growth",
      "body"
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    profileRepo = {
      findActiveByUserId: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      deactivateAllForUser: vi.fn(),
      updateProfileData: vi.fn(),
    };
    quizRepo = { findLatestByUserId: vi.fn() };
    agentRunRepo = { log: vi.fn(), getMetrics: vi.fn() };
    campaignRepo = {
      findById: vi.fn(),
      findByUserId: vi.fn(),
      save: vi.fn(),
      create: vi.fn(),
      updatePlan: vi.fn(),
      updateStrategy: vi.fn(),
      updateCalendar: vi.fn(),
      updateStatus: vi.fn(),
      updateCompletedPlatforms: vi.fn(),
      updateFields: vi.fn(),
      updateCohesionResult: vi.fn(),
      delete: vi.fn(),
    };
    contentRepo = {
      findByCampaignId: vi.fn(),
      findById: vi.fn(),
      createMany: vi.fn(),
      updateStatus: vi.fn(),
      updateContent: vi.fn(),
      updateApprovalStatus: vi.fn(),
      bulkUpdateApprovalStatus: vi.fn(),
      updateBody: vi.fn(),
      updateEnrichments: vi.fn(),
      updateContentPiece: vi.fn(),
      delete: vi.fn(),
      updateSchedule: vi.fn(),
      bulkUpdateSchedule: vi.fn(),
      updateHashtags: vi.fn(),
      updateTargetCommunity: vi.fn(),
      updateLastEngagementFetch: vi.fn(),
      findStalePublished: vi.fn(),
      findRecentByUserId: vi.fn(),
    };
    engagementRepo = {
      upsertEngagement: vi.fn(),
      getEngagementByContentId: vi.fn(),
      getAverageEngagementRate: vi.fn(),
    };
    feedbackAgent = { analyzeFeedbackLoop: vi.fn() };
    feedbackDeps = {
      engagementRepo: engagementRepo as unknown as EngagementRepository,
      contentRepo: contentRepo as unknown as CampaignContentRepository,
      campaignRepo: campaignRepo as unknown as CampaignRepository,
      feedbackAgent: feedbackAgent as never,
    };
  });

  it("throws NO_PROFILE when no active profile", async () => {
    profileRepo.findActiveByUserId.mockResolvedValue(null);
    await expect(
      buildService(feedbackDeps).proposeFeedbackChanges("user-1")
    ).rejects.toThrow("No audience profile found");
  });

  it("throws NOT_CONFIGURED when feedbackDeps missing", async () => {
    profileRepo.findActiveByUserId.mockResolvedValue(profileEntity());
    await expect(
      buildService(undefined).proposeFeedbackChanges("user-1")
    ).rejects.toThrow("Feedback loop not configured");
  });

  it("throws NO_CAMPAIGNS when there are none", async () => {
    profileRepo.findActiveByUserId.mockResolvedValue(profileEntity());
    campaignRepo.findByUserId.mockResolvedValue([]);
    await expect(
      buildService(feedbackDeps).proposeFeedbackChanges("user-1")
    ).rejects.toThrow("No campaigns found");
  });

  it("throws INSUFFICIENT_DATA when fewer than 5 engagement rows", async () => {
    profileRepo.findActiveByUserId.mockResolvedValue(profileEntity());
    campaignRepo.findByUserId.mockResolvedValue([
      Campaign.create({
        id: "camp-1",
        userId: "user-1",
        selectedPlatforms: ["twitter"],
        audienceProfileId: "prof-1",
        quizResponseId: "quiz-1",
      }),
    ]);
    contentRepo.findByCampaignId.mockResolvedValue([content("c-1")]);
    engagementRepo.getEngagementByContentId.mockResolvedValue([
      engagementRow(),
    ]);

    await expect(
      buildService(feedbackDeps).proposeFeedbackChanges("user-1")
    ).rejects.toThrow("Not enough engagement data");
  });

  it("returns agent result and logs success with enough data", async () => {
    profileRepo.findActiveByUserId.mockResolvedValue(profileEntity());
    campaignRepo.findByUserId.mockResolvedValue([
      Campaign.create({
        id: "camp-1",
        userId: "user-1",
        selectedPlatforms: ["twitter"],
        audienceProfileId: "prof-1",
        quizResponseId: "quiz-1",
      }),
    ]);
    contentRepo.findByCampaignId.mockResolvedValue([content("c-1")]);
    engagementRepo.getEngagementByContentId.mockResolvedValue([
      engagementRow({ id: "e1" }),
      engagementRow({ id: "e2", engagementRate: null }),
      engagementRow({ id: "e3" }),
      engagementRow({ id: "e4" }),
      engagementRow({ id: "e5" }),
    ]);
    feedbackAgent.analyzeFeedbackLoop.mockResolvedValue({
      result: { proposedChanges: [], summary: "ok" },
      modelUsed: "claude",
      tokensUsed: 77,
    });

    const result =
      await buildService(feedbackDeps).proposeFeedbackChanges("user-1");

    expect(result).toEqual({ proposedChanges: [], summary: "ok" });
    // engagementRate null coerced to 0
    expect(feedbackAgent.analyzeFeedbackLoop).toHaveBeenCalledWith(
      expect.objectContaining({
        engagementData: expect.arrayContaining([
          expect.objectContaining({ engagementRate: 0 }),
        ]),
      })
    );
    expect(agentRunRepo.log).toHaveBeenCalledWith(
      expect.objectContaining({ status: "success", tokensUsed: 77 })
    );
  });

  it("logs failure and throws AGENT_FAILED when the feedback agent errors", async () => {
    profileRepo.findActiveByUserId.mockResolvedValue(profileEntity());
    campaignRepo.findByUserId.mockResolvedValue([
      Campaign.create({
        id: "camp-1",
        userId: "user-1",
        selectedPlatforms: ["twitter"],
        audienceProfileId: "prof-1",
        quizResponseId: "quiz-1",
      }),
    ]);
    contentRepo.findByCampaignId.mockResolvedValue([content("c-1")]);
    engagementRepo.getEngagementByContentId.mockResolvedValue(
      Array.from({ length: 5 }, (_, i) => engagementRow({ id: `e${i}` }))
    );
    feedbackAgent.analyzeFeedbackLoop.mockRejectedValue(new Error("nope"));

    await expect(
      buildService(feedbackDeps).proposeFeedbackChanges("user-1")
    ).rejects.toThrow("Failed to analyze feedback");
    expect(agentRunRepo.log).toHaveBeenCalledWith(
      expect.objectContaining({ status: "failed", errorMessage: "nope" })
    );
  });
});

describe("AudienceService.applyFeedbackChanges", () => {
  let profileRepo: MockRepo<AudienceProfileRepository>;
  let service: AudienceService;

  beforeEach(() => {
    vi.clearAllMocks();
    profileRepo = {
      findActiveByUserId: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      deactivateAllForUser: vi.fn(),
      updateProfileData: vi.fn(),
    };
    service = new AudienceService(
      profileRepo as unknown as AudienceProfileRepository,
      { findLatestByUserId: vi.fn() } as never,
      { log: vi.fn(), getMetrics: vi.fn() } as never,
      { analyzeAudience: vi.fn() } as never
    );
  });

  it("throws NO_PROFILE when no active profile", async () => {
    profileRepo.findActiveByUserId.mockResolvedValue(null);
    await expect(service.applyFeedbackChanges("user-1", [])).rejects.toThrow(
      "No audience profile found"
    );
  });

  it("applies changes and upgrades quiz_based → data_informed", async () => {
    profileRepo.findActiveByUserId.mockResolvedValue(
      new AudienceProfileEntity(
        "prof-1",
        "user-1",
        "quiz-1",
        JSON.parse(JSON.stringify(audienceProfileFixture)),
        "quiz_based",
        null,
        true,
        new Date()
      )
    );
    profileRepo.updateProfileData.mockImplementation(async (_id, data) => data);

    const changes: AudienceProfileChange[] = [
      { field: "keywords", newValue: ["new-kw"] } as AudienceProfileChange,
    ];

    await service.applyFeedbackChanges("user-1", changes);

    expect(profileRepo.updateProfileData).toHaveBeenCalledWith(
      "prof-1",
      expect.objectContaining({ keywords: ["new-kw"] }),
      "data_informed"
    );
  });

  it("upgrades data_informed → data_validated", async () => {
    profileRepo.findActiveByUserId.mockResolvedValue(
      new AudienceProfileEntity(
        "prof-1",
        "user-1",
        "quiz-1",
        JSON.parse(JSON.stringify(audienceProfileFixture)),
        "data_informed",
        null,
        true,
        new Date()
      )
    );
    profileRepo.updateProfileData.mockResolvedValue({} as never);

    await service.applyFeedbackChanges("user-1", []);

    expect(profileRepo.updateProfileData).toHaveBeenCalledWith(
      "prof-1",
      expect.any(Object),
      "data_validated"
    );
  });
});
