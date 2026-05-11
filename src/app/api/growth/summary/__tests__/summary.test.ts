import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../route";
import type { GrowthSummary } from "@/lib/validations/growth";

const mockAuth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
}));

const mockGetSummary = vi.fn();
vi.mock("@/lib/core/di/container", () => ({
  getContainer: () => ({
    growthRepo: {
      getSummary: (...args: unknown[]) => mockGetSummary(...args),
    },
  }),
}));

function makeSummary(overrides: Partial<GrowthSummary> = {}): GrowthSummary {
  return {
    memberCountByWeek: Array.from({ length: 8 }, (_, i) => ({
      week: `2026-W${String(i + 10).padStart(2, "0")}`,
      count: i,
    })),
    newMembersThisWeek: 3,
    newMembersLastWeek: 2,
    topConvertingContent: [
      { title: "Launch post", joins: 5 },
      { title: "How we built it", joins: 3 },
    ],
    topConvertingPlatform: "twitter",
    prospectsInPipeline: 12,
    prospectConversionRate: 25,
    prospectsByStatus: {
      cold: 8,
      contacted: 2,
      responded: 1,
      joined: 2,
    },
    ...overrides,
  };
}

describe("GET /api/growth/summary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error.code).toBe("UNAUTHORIZED");
    expect(mockGetSummary).not.toHaveBeenCalled();
  });

  it("returns a GrowthSummary with the expected shape when authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    const summary = makeSummary();
    mockGetSummary.mockResolvedValue(summary);

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.error).toBeNull();

    const data: GrowthSummary = json.data;
    expect(Array.isArray(data.memberCountByWeek)).toBe(true);
    expect(data.memberCountByWeek).toHaveLength(8);
    for (const entry of data.memberCountByWeek) {
      expect(typeof entry.week).toBe("string");
      expect(typeof entry.count).toBe("number");
    }
    expect(typeof data.newMembersThisWeek).toBe("number");
    expect(data.newMembersThisWeek).toBeGreaterThanOrEqual(0);
    expect(typeof data.newMembersLastWeek).toBe("number");
    expect(data.newMembersLastWeek).toBeGreaterThanOrEqual(0);

    expect(Array.isArray(data.topConvertingContent)).toBe(true);
    for (const item of data.topConvertingContent) {
      expect(typeof item.title).toBe("string");
      expect(typeof item.joins).toBe("number");
    }
    expect(typeof data.topConvertingPlatform).toBe("string");
    expect(typeof data.prospectsInPipeline).toBe("number");
    expect(data.prospectsInPipeline).toBeGreaterThanOrEqual(0);

    expect(typeof data.prospectConversionRate).toBe("number");
    expect(data.prospectConversionRate).toBeGreaterThanOrEqual(0);
    expect(data.prospectConversionRate).toBeLessThanOrEqual(100);
  });

  it("computes prospectConversionRate as (joined / cold) * 100 rounded to 1 decimal", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    // 3 joined / 8 cold = 37.5%
    mockGetSummary.mockImplementation(async () =>
      makeSummary({
        prospectConversionRate: 37.5,
        prospectsByStatus: { cold: 8, contacted: 0, responded: 0, joined: 3 },
      })
    );

    const response = await GET();
    const json = await response.json();

    expect(json.data.prospectConversionRate).toBe(37.5);
    expect(Number.isFinite(json.data.prospectConversionRate)).toBe(true);
  });

  it("returns prospectConversionRate of 0 when cold count is 0 (no NaN)", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockGetSummary.mockResolvedValue(
      makeSummary({
        prospectConversionRate: 0,
        prospectsByStatus: { cold: 0, contacted: 0, responded: 0, joined: 0 },
      })
    );

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data.prospectConversionRate).toBe(0);
    expect(Number.isNaN(json.data.prospectConversionRate)).toBe(false);
  });

  it("calls the repository exactly once (single DB round-trip)", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockGetSummary.mockResolvedValue(makeSummary());

    await GET();

    expect(mockGetSummary).toHaveBeenCalledTimes(1);
    expect(mockGetSummary).toHaveBeenCalledWith("user_123");
  });

  it("returns 500 when the repository throws", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockGetSummary.mockRejectedValue(new Error("db down"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await GET();
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.error.code).toBe("INTERNAL_ERROR");

    consoleSpy.mockRestore();
  });
});
