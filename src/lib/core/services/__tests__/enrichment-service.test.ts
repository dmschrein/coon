import { describe, it, expect, vi, beforeEach } from "vitest";
import { EnrichmentService } from "../enrichment-service";
import type {
  CampaignContentRepository,
  CampaignRepository,
  EngagementRepository,
  PostEngagementRow,
} from "../../repositories/interfaces";
import type {
  SocialPlatformAdapter,
  PlatformEngagement,
} from "@/lib/services/social/types";
import { AuthExpiredError, RateLimitError } from "@/lib/services/social/types";

// ─── Mock Factories ──────────────────────────────────────────────────────────

type MockRepo<T> = { [K in keyof T]: ReturnType<typeof vi.fn> };

function createMockContentRepo(): MockRepo<CampaignContentRepository> {
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
  };
}

function createMockCampaignRepo(): MockRepo<CampaignRepository> {
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

function createMockEngagementRepo(): MockRepo<EngagementRepository> {
  return {
    upsertEngagement: vi.fn(),
    getEngagementByContentId: vi.fn(),
  };
}

const mockEngagementResult: PostEngagementRow = {
  id: "eng-1",
  campaignContentId: "content-1",
  platform: "instagram",
  platformPostId: "post_abc",
  likes: 150,
  comments: 25,
  shares: 10,
  reach: 800,
  impressions: 1200,
  engagementRate: "15.42",
  recordedAt: new Date("2026-04-20T12:00:00Z"),
  createdAt: new Date("2026-04-20T12:00:00Z"),
};

const mockPlatformEngagement: PlatformEngagement = {
  likes: 150,
  comments: 25,
  shares: 10,
  reach: 800,
  impressions: 1200,
  engagementRate: "15.42",
  recordedAt: new Date("2026-04-20T12:00:00Z"),
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("EnrichmentService — fetchAndStoreEngagement", () => {
  let contentRepo: MockRepo<CampaignContentRepository>;
  let campaignRepo: MockRepo<CampaignRepository>;
  let engagementRepo: MockRepo<EngagementRepository>;
  let mockAdapter: {
    fetchEngagement: ReturnType<typeof vi.fn>;
    platform: string;
  };
  let mockGetAdapter: ReturnType<typeof vi.fn>;
  let service: EnrichmentService;

  beforeEach(() => {
    contentRepo = createMockContentRepo();
    campaignRepo = createMockCampaignRepo();
    engagementRepo = createMockEngagementRepo();
    mockAdapter = {
      platform: "instagram",
      fetchEngagement: vi.fn(),
    };
    mockGetAdapter = vi.fn().mockReturnValue(mockAdapter);

    service = new EnrichmentService(
      contentRepo as unknown as CampaignContentRepository,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { enrichContentWithMedia: vi.fn(), isVisualPlatform: vi.fn() } as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { scoreContent: vi.fn() } as any,
      campaignRepo as unknown as CampaignRepository,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { optimizeContent: vi.fn() } as any,
      engagementRepo as unknown as EngagementRepository,
      mockGetAdapter
    );
  });

  it("fetches engagement and upserts to repository", async () => {
    mockAdapter.fetchEngagement.mockResolvedValue(mockPlatformEngagement);
    engagementRepo.upsertEngagement.mockResolvedValue(mockEngagementResult);

    const result = await service.fetchAndStoreEngagement(
      "content-1",
      "instagram",
      "post_abc",
      "access_token_123"
    );

    expect(mockGetAdapter).toHaveBeenCalledWith("instagram");
    expect(mockAdapter.fetchEngagement).toHaveBeenCalledWith(
      "post_abc",
      "access_token_123"
    );
    expect(engagementRepo.upsertEngagement).toHaveBeenCalledWith({
      campaignContentId: "content-1",
      platform: "instagram",
      platformPostId: "post_abc",
      likes: 150,
      comments: 25,
      shares: 10,
      reach: 800,
      impressions: 1200,
      engagementRate: "15.42",
      recordedAt: mockPlatformEngagement.recordedAt,
    });
    expect(result).toEqual(mockEngagementResult);
  });

  it("returns the upserted PostEngagementRow with all fields", async () => {
    mockAdapter.fetchEngagement.mockResolvedValue(mockPlatformEngagement);
    engagementRepo.upsertEngagement.mockResolvedValue(mockEngagementResult);

    const result = await service.fetchAndStoreEngagement(
      "content-1",
      "instagram",
      "post_abc",
      "token"
    );

    expect(result.id).toBe("eng-1");
    expect(result.campaignContentId).toBe("content-1");
    expect(result.platform).toBe("instagram");
    expect(result.likes).toBe(150);
    expect(result.createdAt).toBeInstanceOf(Date);
  });

  it("propagates AuthExpiredError from adapter", async () => {
    mockAdapter.fetchEngagement.mockRejectedValue(new AuthExpiredError());

    await expect(
      service.fetchAndStoreEngagement(
        "content-1",
        "instagram",
        "post_abc",
        "expired_token"
      )
    ).rejects.toThrow(AuthExpiredError);

    expect(engagementRepo.upsertEngagement).not.toHaveBeenCalled();
  });

  it("propagates RateLimitError from adapter", async () => {
    mockAdapter.fetchEngagement.mockRejectedValue(new RateLimitError());

    await expect(
      service.fetchAndStoreEngagement(
        "content-1",
        "instagram",
        "post_abc",
        "token"
      )
    ).rejects.toThrow(RateLimitError);

    expect(engagementRepo.upsertEngagement).not.toHaveBeenCalled();
  });

  it("throws when no adapter for platform", async () => {
    mockGetAdapter.mockReturnValue(null);

    await expect(
      service.fetchAndStoreEngagement(
        "content-1",
        "twitter",
        "tweet_123",
        "token"
      )
    ).rejects.toThrow("No adapter configured for platform: twitter");
  });

  it("throws when adapter lacks fetchEngagement", async () => {
    mockGetAdapter.mockReturnValue({
      platform: "reddit",
      // no fetchEngagement method
    });

    await expect(
      service.fetchAndStoreEngagement(
        "content-1",
        "reddit",
        "post_xyz",
        "token"
      )
    ).rejects.toThrow("reddit adapter does not support fetchEngagement");
  });

  it("throws when engagement repo not configured", async () => {
    const serviceWithoutRepo = new EnrichmentService(
      contentRepo as unknown as CampaignContentRepository,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { enrichContentWithMedia: vi.fn(), isVisualPlatform: vi.fn() } as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { scoreContent: vi.fn() } as any,
      campaignRepo as unknown as CampaignRepository,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { optimizeContent: vi.fn() } as any
      // no engagementRepo or getAdapter
    );

    await expect(
      serviceWithoutRepo.fetchAndStoreEngagement(
        "content-1",
        "instagram",
        "post_abc",
        "token"
      )
    ).rejects.toThrow("Engagement repository not configured");
  });

  it("handles null engagementRate from adapter", async () => {
    const engagementWithNull: PlatformEngagement = {
      ...mockPlatformEngagement,
      engagementRate: null,
    };
    mockAdapter.fetchEngagement.mockResolvedValue(engagementWithNull);
    engagementRepo.upsertEngagement.mockResolvedValue({
      ...mockEngagementResult,
      engagementRate: null,
    });

    await service.fetchAndStoreEngagement(
      "content-1",
      "instagram",
      "post_abc",
      "token"
    );

    expect(engagementRepo.upsertEngagement).toHaveBeenCalledWith(
      expect.objectContaining({ engagementRate: undefined })
    );
  });
});
