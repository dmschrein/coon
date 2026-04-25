import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../route";
import { CampaignContentEntity } from "@/lib/core/domain/content";
import type { PostEngagementRow } from "@/lib/core/repositories/interfaces";

// Mock Clerk auth
const mockAuth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
}));

// Mock the DI container
const mockFindById = vi.fn();
const mockFindByCampaignId = vi.fn();
const mockGetEngagementByContentId = vi.fn();

vi.mock("@/lib/core/di/container", () => ({
  getContainer: () => ({
    campaignRepo: {
      findById: (...args: unknown[]) => mockFindById(...args),
    },
    contentRepo: {
      findByCampaignId: (...args: unknown[]) => mockFindByCampaignId(...args),
    },
    engagementRepo: {
      getEngagementByContentId: (...args: unknown[]) =>
        mockGetEngagementByContentId(...args),
    },
  }),
}));

const mockEngagementRow: PostEngagementRow = {
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

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/campaign/[id]/engagement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const response = await GET(
      new Request("http://localhost/api/campaign/c-1/engagement"),
      makeParams("c-1")
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error.code).toBe("UNAUTHORIZED");
    expect(data.data).toBeNull();
  });

  it("returns 404 when campaign not found", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockFindById.mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost/api/campaign/c-1/engagement"),
      makeParams("c-1")
    );
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error.code).toBe("NOT_FOUND");
    expect(mockFindById).toHaveBeenCalledWith("c-1", "user_123");
  });

  it("returns 200 with empty array when no engagement records", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockFindById.mockResolvedValue({ id: "c-1" });
    mockFindByCampaignId.mockResolvedValue([]);

    const response = await GET(
      new Request("http://localhost/api/campaign/c-1/engagement"),
      makeParams("c-1")
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toEqual([]);
    expect(data.error).toBeNull();
  });

  it("returns 200 with engagement data", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockFindById.mockResolvedValue({ id: "c-1" });

    const content = CampaignContentEntity.create({
      id: "content-1",
      campaignId: "c-1",
      userId: "user_123",
      platform: "instagram",
    });
    mockFindByCampaignId.mockResolvedValue([content]);
    mockGetEngagementByContentId.mockResolvedValue([mockEngagementRow]);

    const response = await GET(
      new Request("http://localhost/api/campaign/c-1/engagement"),
      makeParams("c-1")
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.error).toBeNull();
    expect(data.data).toHaveLength(1);
    expect(data.data[0]).toMatchObject({
      contentId: "content-1",
      platform: "instagram",
      likes: 150,
      comments: 25,
      shares: 10,
      reach: 800,
      impressions: 1200,
      engagementRate: "15.42",
    });
    expect(mockGetEngagementByContentId).toHaveBeenCalledWith("content-1");
  });

  it("returns 500 on unexpected error", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockFindById.mockRejectedValue(new Error("DB connection failed"));

    const response = await GET(
      new Request("http://localhost/api/campaign/c-1/engagement"),
      makeParams("c-1")
    );
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error.code).toBe("INTERNAL_ERROR");
  });
});
