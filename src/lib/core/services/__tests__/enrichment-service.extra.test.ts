import { describe, it, expect, vi, beforeEach } from "vitest";
import { EnrichmentService } from "../enrichment-service";
import { CampaignContentEntity } from "../../domain/content";
import type {
  CampaignContentRepository,
  CampaignRepository,
} from "../../repositories/interfaces";

type MockRepo<T> = { [K in keyof T]: ReturnType<typeof vi.fn> };

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

function makeContent(
  overrides: Partial<{
    id: string;
    userId: string;
    platform: string;
    status: string;
    enrichments: unknown;
  }> = {}
): CampaignContentEntity {
  const c = new CampaignContentEntity(
    overrides.id ?? "c-1",
    "camp-1",
    overrides.userId ?? "user-1",
    (overrides.platform ?? "instagram") as never,
    (overrides.status ?? "complete") as never,
    { body: "x" },
    null,
    null,
    new Date(),
    "approved",
    "Title",
    "growth",
    "body text"
  );
  if ("enrichments" in overrides) c.enrichments = overrides.enrichments;
  return c;
}

describe("EnrichmentService — media generation", () => {
  let contentRepo: MockRepo<CampaignContentRepository>;
  let campaignRepo: MockRepo<CampaignRepository>;
  let mediaAgent: {
    enrichContentWithMedia: ReturnType<typeof vi.fn>;
    isVisualPlatform: ReturnType<typeof vi.fn>;
  };
  let service: EnrichmentService;

  beforeEach(() => {
    vi.clearAllMocks();
    contentRepo = createContentRepo();
    campaignRepo = createCampaignRepo();
    mediaAgent = {
      enrichContentWithMedia: vi.fn(),
      isVisualPlatform: vi.fn().mockReturnValue(true),
    };
    service = new EnrichmentService(
      contentRepo as unknown as CampaignContentRepository,
      mediaAgent as never,
      { scoreContent: vi.fn() } as never,
      campaignRepo as unknown as CampaignRepository,
      { optimizeContent: vi.fn() } as never
    );
  });

  it("generates media and merges into enrichments", async () => {
    contentRepo.findById.mockResolvedValue(makeContent());
    mediaAgent.enrichContentWithMedia.mockResolvedValue({
      assets: [{ id: 1 }],
    });

    const result = await service.generateMediaForContent("c-1", "user-1");

    expect(mediaAgent.enrichContentWithMedia).toHaveBeenCalledWith(
      { body: "x" },
      "instagram"
    );
    expect(result.media).toEqual({ assets: [{ id: 1 }] });
    expect(contentRepo.updateEnrichments).toHaveBeenCalledWith("c-1", {
      media: { assets: [{ id: 1 }] },
    });
  });

  it("preserves existing enrichments when adding media", async () => {
    contentRepo.findById.mockResolvedValue(
      makeContent({ enrichments: { scores: { overall: 9 } } })
    );
    mediaAgent.enrichContentWithMedia.mockResolvedValue({ assets: [] });

    const result = await service.generateMediaForContent("c-1", "user-1");
    expect(result.scores).toEqual({ overall: 9 });
    expect(result.media).toEqual({ assets: [] });
  });

  it("throws when content not found", async () => {
    contentRepo.findById.mockResolvedValue(null);
    await expect(
      service.generateMediaForContent("c-1", "user-1")
    ).rejects.toThrow("Content not found: c-1");
  });

  it("throws Unauthorized when content owned by another user", async () => {
    contentRepo.findById.mockResolvedValue(makeContent({ userId: "other" }));
    await expect(
      service.generateMediaForContent("c-1", "user-1")
    ).rejects.toThrow("Unauthorized");
  });

  it("throws when platform is not visual", async () => {
    mediaAgent.isVisualPlatform.mockReturnValue(false);
    contentRepo.findById.mockResolvedValue(makeContent({ platform: "reddit" }));
    await expect(
      service.generateMediaForContent("c-1", "user-1")
    ).rejects.toThrow("reddit is not a visual platform");
  });

  it("generateMediaBatch returns zeros when no eligible content", async () => {
    contentRepo.findByCampaignId.mockResolvedValue([]);
    const result = await service.generateMediaBatch("camp-1", "user-1");
    expect(result).toEqual({ total: 0, succeeded: 0, failed: 0 });
  });

  it("generateMediaBatch processes visual incomplete-media content and counts outcomes", async () => {
    const ok = makeContent({ id: "ok" });
    const bad = makeContent({ id: "bad" });
    contentRepo.findByCampaignId.mockResolvedValue([ok, bad]);
    mediaAgent.enrichContentWithMedia
      .mockResolvedValueOnce({ assets: [{ a: 1 }] })
      .mockRejectedValueOnce(new Error("gen failed"));
    contentRepo.findById.mockImplementation(async (id: string) =>
      id === "ok" ? ok : bad
    );

    const result = await service.generateMediaBatch("camp-1", "user-1");

    expect(result.total).toBe(2);
    expect(result.succeeded).toBe(1);
    expect(result.failed).toBe(1);
  });

  it("generateMediaBatch filters out content that already has media", async () => {
    const withMedia = makeContent({
      id: "has",
      enrichments: { media: { assets: [{ a: 1 }] } },
    });
    contentRepo.findByCampaignId.mockResolvedValue([withMedia]);

    const result = await service.generateMediaBatch("camp-1", "user-1");
    expect(result.total).toBe(0);
  });
});

describe("EnrichmentService — scoring & SEO", () => {
  let contentRepo: MockRepo<CampaignContentRepository>;
  let campaignRepo: MockRepo<CampaignRepository>;
  let scoringAgent: { scoreContent: ReturnType<typeof vi.fn> };
  let seoAgent: { optimizeContent: ReturnType<typeof vi.fn> };
  let service: EnrichmentService;

  beforeEach(() => {
    vi.clearAllMocks();
    contentRepo = createContentRepo();
    campaignRepo = createCampaignRepo();
    scoringAgent = { scoreContent: vi.fn() };
    seoAgent = { optimizeContent: vi.fn() };
    service = new EnrichmentService(
      contentRepo as unknown as CampaignContentRepository,
      { enrichContentWithMedia: vi.fn(), isVisualPlatform: vi.fn() } as never,
      scoringAgent as never,
      campaignRepo as unknown as CampaignRepository,
      seoAgent as never
    );
  });

  it("scores a content piece and merges scores using campaign strategy", async () => {
    contentRepo.findById.mockResolvedValue(makeContent());
    campaignRepo.findById.mockResolvedValue({ strategySummary: "strat" });
    scoringAgent.scoreContent.mockResolvedValue({
      result: { overall: 8 },
      modelUsed: "claude",
      tokensUsed: 1,
    });

    const result = await service.scoreContentPiece("c-1", "user-1");

    expect(scoringAgent.scoreContent).toHaveBeenCalledWith(
      expect.objectContaining({
        strategySummary: "strat",
        platform: "instagram",
      })
    );
    expect(result.scores).toEqual({ overall: 8 });
    expect(contentRepo.updateEnrichments).toHaveBeenCalled();
  });

  it("scoreContentPiece passes null strategySummary when no campaign", async () => {
    contentRepo.findById.mockResolvedValue(makeContent());
    campaignRepo.findById.mockResolvedValue(null);
    scoringAgent.scoreContent.mockResolvedValue({
      result: { overall: 3 },
      modelUsed: "claude",
      tokensUsed: 1,
    });

    await service.scoreContentPiece("c-1", "user-1");
    expect(scoringAgent.scoreContent).toHaveBeenCalledWith(
      expect.objectContaining({ strategySummary: null })
    );
  });

  it("scoreContentPiece throws when content missing or unauthorized", async () => {
    contentRepo.findById.mockResolvedValue(null);
    await expect(service.scoreContentPiece("c-1", "user-1")).rejects.toThrow(
      "Content not found"
    );
    contentRepo.findById.mockResolvedValue(makeContent({ userId: "other" }));
    await expect(service.scoreContentPiece("c-1", "user-1")).rejects.toThrow(
      "Unauthorized"
    );
  });

  it("scoreCampaignContent returns zeros when nothing scorable", async () => {
    contentRepo.findByCampaignId.mockResolvedValue([
      makeContent({ status: "pending" }),
    ]);
    const result = await service.scoreCampaignContent("camp-1", "user-1");
    expect(result).toEqual({ total: 0, succeeded: 0, failed: 0 });
  });

  it("scoreCampaignContent aggregates success/failure across pieces", async () => {
    const a = makeContent({ id: "a" });
    const b = makeContent({ id: "b" });
    contentRepo.findByCampaignId.mockResolvedValue([a, b]);
    contentRepo.findById.mockImplementation(async (id: string) =>
      id === "a" ? a : b
    );
    campaignRepo.findById.mockResolvedValue({ strategySummary: "s" });
    scoringAgent.scoreContent
      .mockResolvedValueOnce({
        result: { overall: 1 },
        modelUsed: "c",
        tokensUsed: 1,
      })
      .mockRejectedValueOnce(new Error("score fail"));

    const result = await service.scoreCampaignContent("camp-1", "user-1");
    expect(result.total).toBe(2);
    expect(result.succeeded).toBe(1);
    expect(result.failed).toBe(1);
  });

  it("optimizes a content piece and merges seoData", async () => {
    contentRepo.findById.mockResolvedValue(makeContent());
    campaignRepo.findById.mockResolvedValue({ strategySummary: "strat" });
    seoAgent.optimizeContent.mockResolvedValue({
      result: { keywords: ["k"] },
      modelUsed: "claude",
      tokensUsed: 2,
    });

    const result = await service.optimizeContentPiece("c-1", "user-1");

    expect(result.seoData).toEqual({ keywords: ["k"] });
    expect(contentRepo.updateEnrichments).toHaveBeenCalled();
  });

  it("optimizeContentPiece throws when content missing or unauthorized", async () => {
    contentRepo.findById.mockResolvedValue(null);
    await expect(service.optimizeContentPiece("c-1", "user-1")).rejects.toThrow(
      "Content not found"
    );
    contentRepo.findById.mockResolvedValue(makeContent({ userId: "other" }));
    await expect(service.optimizeContentPiece("c-1", "user-1")).rejects.toThrow(
      "Unauthorized"
    );
  });

  it("optimizeCampaignContent returns zeros when nothing optimizable", async () => {
    contentRepo.findByCampaignId.mockResolvedValue([
      makeContent({ status: "failed" }),
    ]);
    const result = await service.optimizeCampaignContent("camp-1", "user-1");
    expect(result).toEqual({ total: 0, succeeded: 0, failed: 0 });
  });

  it("optimizeCampaignContent aggregates outcomes", async () => {
    const a = makeContent({ id: "a" });
    contentRepo.findByCampaignId.mockResolvedValue([a]);
    contentRepo.findById.mockResolvedValue(a);
    campaignRepo.findById.mockResolvedValue(null);
    seoAgent.optimizeContent.mockResolvedValue({
      result: { keywords: [] },
      modelUsed: "c",
      tokensUsed: 1,
    });

    const result = await service.optimizeCampaignContent("camp-1", "user-1");
    expect(result).toEqual({ total: 1, succeeded: 1, failed: 0 });
  });
});
