import { describe, it, expect, vi, beforeEach } from "vitest";
import { AnalyticsService } from "../analytics-service";
import { ServiceError } from "../audience-service";
import { Campaign } from "../../domain/campaign";
import { CampaignContentEntity } from "../../domain/content";
import { AudienceProfileEntity } from "../../domain/audience-profile";
import { audienceProfileFixture } from "@/lib/agents/__fixtures__/audience";
import type {
  AnalyticsRepository,
  CampaignRepository,
  CampaignContentRepository,
  AudienceProfileRepository,
  AgentRunRepository,
  CampaignAnalyticsSnapshot,
  ContentAnalyticsRow,
} from "../../repositories/interfaces";

type MockRepo<T> = { [K in keyof T]: ReturnType<typeof vi.fn> };

function createAnalyticsRepo(): MockRepo<AnalyticsRepository> {
  return {
    getLatestCampaignSnapshot: vi.fn(),
    saveCampaignSnapshot: vi.fn(),
    getContentAnalytics: vi.fn(),
    saveContentAnalytics: vi.fn(),
  };
}

function createCampaignRepo(): MockRepo<CampaignRepository> {
  return {
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
}

function createContentRepo(): MockRepo<CampaignContentRepository> {
  return {
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
}

function createProfileRepo(): MockRepo<AudienceProfileRepository> {
  return {
    findActiveByUserId: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    deactivateAllForUser: vi.fn(),
    updateProfileData: vi.fn(),
  };
}

function makeContent(id: string, pillar: string | null, title: string | null) {
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
    title,
    pillar,
    "body"
  );
}

function makeMetric(
  overrides: Partial<ContentAnalyticsRow> = {}
): ContentAnalyticsRow {
  return {
    id: "ca-1",
    campaignContentId: "c-1",
    campaignId: "camp-1",
    platform: "twitter",
    reach: 100,
    impressions: 200,
    likes: 5,
    comments: 3,
    shares: 1,
    clicks: 0,
    saves: 1,
    engagementRate: "10",
    fetchedAt: new Date(),
    ...overrides,
  };
}

const snapshot: CampaignAnalyticsSnapshot = {
  id: "snap-1",
  campaignId: "camp-1",
  totalReach: 300,
  totalEngagements: 30,
  totalImpressions: 600,
  engagementRate: "10.00",
  followerGrowth: 12,
  platformBreakdown: [{ platform: "twitter", reach: 300 }],
  pillarBreakdown: [{ pillar: "growth" }],
  aiInsights: ["insight a"],
  aiRecommendations: ["rec a"],
  snapshotDate: new Date("2026-05-01T00:00:00.000Z"),
};

function makeCampaign() {
  const c = Campaign.create({
    id: "camp-1",
    userId: "user-1",
    selectedPlatforms: ["twitter"],
    audienceProfileId: "prof-1",
    quizResponseId: "quiz-1",
  });
  c.name = "My Campaign";
  c.strategySummary = "Summary";
  return c;
}

describe("AnalyticsService.getCampaignAnalytics", () => {
  let analyticsRepo: MockRepo<AnalyticsRepository>;
  let campaignRepo: MockRepo<CampaignRepository>;
  let contentRepo: MockRepo<CampaignContentRepository>;
  let profileRepo: MockRepo<AudienceProfileRepository>;
  let agentRunRepo: MockRepo<AgentRunRepository>;
  let insightsAgent: { generateAnalyticsInsights: ReturnType<typeof vi.fn> };
  let service: AnalyticsService;

  beforeEach(() => {
    vi.clearAllMocks();
    analyticsRepo = createAnalyticsRepo();
    campaignRepo = createCampaignRepo();
    contentRepo = createContentRepo();
    profileRepo = createProfileRepo();
    agentRunRepo = { log: vi.fn(), getMetrics: vi.fn() };
    insightsAgent = { generateAnalyticsInsights: vi.fn() };
    service = new AnalyticsService(
      analyticsRepo as unknown as AnalyticsRepository,
      campaignRepo as unknown as CampaignRepository,
      contentRepo as unknown as CampaignContentRepository,
      profileRepo as unknown as AudienceProfileRepository,
      agentRunRepo as unknown as AgentRunRepository,
      insightsAgent as unknown as ConstructorParameters<
        typeof AnalyticsService
      >[5]
    );
  });

  it("returns null when there is no snapshot", async () => {
    analyticsRepo.getLatestCampaignSnapshot.mockResolvedValue(null);
    const result = await service.getCampaignAnalytics("camp-1", "user-1");
    expect(result).toBeNull();
  });

  it("builds content rankings sorted by engagement and maps snapshot fields", async () => {
    analyticsRepo.getLatestCampaignSnapshot.mockResolvedValue(snapshot);
    analyticsRepo.getContentAnalytics.mockResolvedValue([
      makeMetric({ campaignContentId: "c-1", likes: 1, reach: 100 }),
      makeMetric({
        campaignContentId: "c-2",
        likes: 50,
        comments: 0,
        shares: 0,
        saves: 0,
        reach: 100,
      }),
    ]);
    contentRepo.findByCampaignId.mockResolvedValue([
      makeContent("c-1", "growth", "Post 1"),
      makeContent("c-2", "retention", "Post 2"),
    ]);

    const result = await service.getCampaignAnalytics("camp-1", "user-1");

    expect(result).not.toBeNull();
    expect(result!.totalReach).toBe(300);
    expect(result!.engagementRate).toBe(10);
    expect(result!.platformBreakdown).toHaveLength(1);
    // c-2 has 50 engagements > c-1, should sort first
    expect(result!.contentRankings[0].contentId).toBe("c-2");
    expect(result!.contentRankings[0].title).toBe("Post 2");
    expect(result!.contentRankings[0].engagementRate).toBe(50);
    expect(result!.snapshotDate).toBe("2026-05-01T00:00:00.000Z");
  });

  it("falls back to empty arrays and 0 rate when snapshot fields are null", async () => {
    analyticsRepo.getLatestCampaignSnapshot.mockResolvedValue({
      ...snapshot,
      engagementRate: null,
      platformBreakdown: null,
      pillarBreakdown: null,
      aiInsights: null,
      aiRecommendations: null,
    });
    analyticsRepo.getContentAnalytics.mockResolvedValue([]);
    contentRepo.findByCampaignId.mockResolvedValue([]);

    const result = await service.getCampaignAnalytics("camp-1", "user-1");

    expect(result!.engagementRate).toBe(0);
    expect(result!.platformBreakdown).toEqual([]);
    expect(result!.aiInsights).toEqual([]);
    expect(result!.contentRankings).toEqual([]);
  });

  it("handles reach=0 metric (engagementRate 0) and missing content piece", async () => {
    analyticsRepo.getLatestCampaignSnapshot.mockResolvedValue(snapshot);
    analyticsRepo.getContentAnalytics.mockResolvedValue([
      makeMetric({ campaignContentId: "orphan", reach: 0 }),
    ]);
    contentRepo.findByCampaignId.mockResolvedValue([]);

    const result = await service.getCampaignAnalytics("camp-1", "user-1");

    expect(result!.contentRankings[0].engagementRate).toBe(0);
    expect(result!.contentRankings[0].title).toBeNull();
    expect(result!.contentRankings[0].pillar).toBeNull();
  });
});

describe("AnalyticsService.generateInsights", () => {
  let analyticsRepo: MockRepo<AnalyticsRepository>;
  let campaignRepo: MockRepo<CampaignRepository>;
  let contentRepo: MockRepo<CampaignContentRepository>;
  let profileRepo: MockRepo<AudienceProfileRepository>;
  let agentRunRepo: MockRepo<AgentRunRepository>;
  let insightsAgent: { generateAnalyticsInsights: ReturnType<typeof vi.fn> };
  let service: AnalyticsService;

  beforeEach(() => {
    vi.clearAllMocks();
    analyticsRepo = createAnalyticsRepo();
    campaignRepo = createCampaignRepo();
    contentRepo = createContentRepo();
    profileRepo = createProfileRepo();
    agentRunRepo = { log: vi.fn(), getMetrics: vi.fn() };
    insightsAgent = { generateAnalyticsInsights: vi.fn() };
    service = new AnalyticsService(
      analyticsRepo as unknown as AnalyticsRepository,
      campaignRepo as unknown as CampaignRepository,
      contentRepo as unknown as CampaignContentRepository,
      profileRepo as unknown as AudienceProfileRepository,
      agentRunRepo as unknown as AgentRunRepository,
      insightsAgent as unknown as ConstructorParameters<
        typeof AnalyticsService
      >[5]
    );
    analyticsRepo.saveCampaignSnapshot.mockResolvedValue(snapshot);
  });

  it("throws NOT_FOUND when campaign missing", async () => {
    campaignRepo.findById.mockResolvedValue(null);
    await expect(service.generateInsights("camp-1", "user-1")).rejects.toThrow(
      ServiceError
    );
  });

  it("aggregates platform/pillar breakdowns, runs the agent, and saves a snapshot", async () => {
    campaignRepo.findById.mockResolvedValue(makeCampaign());
    analyticsRepo.getContentAnalytics.mockResolvedValue([
      makeMetric({
        campaignContentId: "c-1",
        platform: "twitter",
        reach: 100,
        impressions: 200,
        likes: 10,
        comments: 0,
        shares: 0,
        saves: 0,
      }),
      makeMetric({
        campaignContentId: "c-2",
        platform: "twitter",
        reach: 100,
        impressions: 100,
        likes: 20,
        comments: 0,
        shares: 0,
        saves: 0,
      }),
    ]);
    contentRepo.findByCampaignId.mockResolvedValue([
      makeContent("c-1", "growth", "P1"),
      makeContent("c-2", "growth", "P2"),
    ]);
    insightsAgent.generateAnalyticsInsights.mockResolvedValue({
      result: { insights: ["i1"], recommendations: ["r1"] },
      modelUsed: "claude",
      tokensUsed: 42,
    });

    const result = await service.generateInsights("camp-1", "user-1");

    // 30 engagements / 200 reach = 15%
    expect(result.totalReach).toBe(200);
    expect(result.totalEngagements).toBe(30);
    expect(result.engagementRate).toBe(15);
    expect(result.platformBreakdown[0].engagementRate).toBe(15);
    expect(result.pillarBreakdown[0].pillar).toBe("growth");
    expect(result.pillarBreakdown[0].contentCount).toBe(2);
    expect(result.aiInsights).toEqual(["i1"]);
    expect(agentRunRepo.log).toHaveBeenCalledWith(
      expect.objectContaining({ status: "success", tokensUsed: 42 })
    );
    expect(analyticsRepo.saveCampaignSnapshot).toHaveBeenCalled();
  });

  it("uses 'uncategorized' pillar when content piece is missing and handles reach=0", async () => {
    campaignRepo.findById.mockResolvedValue(makeCampaign());
    analyticsRepo.getContentAnalytics.mockResolvedValue([
      makeMetric({ campaignContentId: "orphan", reach: 0, impressions: 0 }),
    ]);
    contentRepo.findByCampaignId.mockResolvedValue([]);
    insightsAgent.generateAnalyticsInsights.mockResolvedValue({
      result: { insights: [], recommendations: [] },
      modelUsed: "claude",
      tokensUsed: 1,
    });

    const result = await service.generateInsights("camp-1", "user-1");

    expect(result.pillarBreakdown[0].pillar).toBe("uncategorized");
    expect(result.pillarBreakdown[0].avgEngagementRate).toBe(0);
    expect(result.engagementRate).toBe(0);
  });

  it("continues and logs failure when the insights agent throws", async () => {
    campaignRepo.findById.mockResolvedValue(makeCampaign());
    analyticsRepo.getContentAnalytics.mockResolvedValue([makeMetric()]);
    contentRepo.findByCampaignId.mockResolvedValue([
      makeContent("c-1", "growth", "P1"),
    ]);
    insightsAgent.generateAnalyticsInsights.mockRejectedValue(
      new Error("agent boom")
    );

    const result = await service.generateInsights("camp-1", "user-1");

    expect(result.aiInsights).toEqual([]);
    expect(result.aiRecommendations).toEqual([]);
    expect(agentRunRepo.log).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "failed",
        errorMessage: "agent boom",
      })
    );
    // snapshot still saved
    expect(analyticsRepo.saveCampaignSnapshot).toHaveBeenCalled();
  });

  it("upgrades audience confidence via the flywheel when agent returns audienceUpdates", async () => {
    campaignRepo.findById.mockResolvedValue(makeCampaign());
    analyticsRepo.getContentAnalytics.mockResolvedValue([makeMetric()]);
    contentRepo.findByCampaignId.mockResolvedValue([
      makeContent("c-1", "growth", "P1"),
    ]);
    const profile = new AudienceProfileEntity(
      "prof-1",
      "user-1",
      "quiz-1",
      audienceProfileFixture,
      "quiz_based",
      { patterns: ["old"] },
      true,
      new Date()
    );
    profileRepo.findById.mockResolvedValue(profile);
    insightsAgent.generateAnalyticsInsights.mockResolvedValue({
      result: {
        insights: ["i"],
        recommendations: ["r"],
        audienceUpdates: {
          confidenceLevel: "data_validated",
          newPatterns: ["new-pattern"],
        },
      },
      modelUsed: "claude",
      tokensUsed: 9,
    });

    await service.generateInsights("camp-1", "user-1");

    expect(profileRepo.findById).toHaveBeenCalledWith("prof-1");
    expect(profile.confidenceLevel).toBe("data_validated");
    const patterns = (profile.analyticsData as { patterns: string[] }).patterns;
    expect(patterns).toEqual(["old", "new-pattern"]);
  });

  it("does not downgrade confidence and handles missing profile in flywheel", async () => {
    campaignRepo.findById.mockResolvedValue(makeCampaign());
    analyticsRepo.getContentAnalytics.mockResolvedValue([makeMetric()]);
    contentRepo.findByCampaignId.mockResolvedValue([
      makeContent("c-1", "growth", "P1"),
    ]);
    // profile missing → updateAudienceConfidence returns early
    profileRepo.findById.mockResolvedValue(null);
    insightsAgent.generateAnalyticsInsights.mockResolvedValue({
      result: {
        insights: ["i"],
        recommendations: ["r"],
        audienceUpdates: {
          confidenceLevel: "quiz_based",
          newPatterns: [],
        },
      },
      modelUsed: "claude",
      tokensUsed: 9,
    });

    await expect(
      service.generateInsights("camp-1", "user-1")
    ).resolves.toBeTruthy();
    expect(profileRepo.findById).toHaveBeenCalledWith("prof-1");
  });

  it("keeps higher confidence when agent suggests a lower level", async () => {
    campaignRepo.findById.mockResolvedValue(makeCampaign());
    analyticsRepo.getContentAnalytics.mockResolvedValue([makeMetric()]);
    contentRepo.findByCampaignId.mockResolvedValue([
      makeContent("c-1", "growth", "P1"),
    ]);
    const profile = new AudienceProfileEntity(
      "prof-1",
      "user-1",
      "quiz-1",
      audienceProfileFixture,
      "data_validated",
      null,
      true,
      new Date()
    );
    profileRepo.findById.mockResolvedValue(profile);
    insightsAgent.generateAnalyticsInsights.mockResolvedValue({
      result: {
        insights: ["i"],
        recommendations: ["r"],
        audienceUpdates: {
          confidenceLevel: "quiz_based",
          newPatterns: ["p"],
        },
      },
      modelUsed: "claude",
      tokensUsed: 9,
    });

    await service.generateInsights("camp-1", "user-1");

    // should stay data_validated (no downgrade), and analyticsData starts from null
    expect(profile.confidenceLevel).toBe("data_validated");
    const patterns = (profile.analyticsData as { patterns: string[] }).patterns;
    expect(patterns).toEqual(["p"]);
  });
});
