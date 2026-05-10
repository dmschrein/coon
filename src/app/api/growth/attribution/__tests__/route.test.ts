import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../route";

const mockAuth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
}));

const mockGetGrowthAttribution = vi.fn();
vi.mock("@/lib/core/di/container", () => ({
  getContainer: () => ({
    prospectRepo: {
      getGrowthAttribution: (...args: unknown[]) =>
        mockGetGrowthAttribution(...args),
    },
  }),
}));

const mockResult = {
  topConvertingContent: [
    {
      contentId: "content-1",
      title: "Top piece",
      pillar: "education",
      platform: "twitter",
      joins: 5,
    },
  ],
  topConvertingPlatform: { platform: "twitter", joins: 5 },
  topConvertingPillar: { pillar: "education", joins: 5 },
  joinsByPillar: [{ pillar: "education", joins: 5 }],
  totalJoins: 5,
};

describe("GET /api/growth/attribution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error.code).toBe("UNAUTHORIZED");
  });

  it("returns attribution result for authenticated user", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockGetGrowthAttribution.mockResolvedValue(mockResult);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toEqual(mockResult);
    expect(data.error).toBeNull();
    expect(mockGetGrowthAttribution).toHaveBeenCalledWith("user_123");
  });

  it("returns 500 when repo throws", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockGetGrowthAttribution.mockRejectedValue(new Error("db failed"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error.code).toBe("INTERNAL_ERROR");

    consoleSpy.mockRestore();
  });
});
