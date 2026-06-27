import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildReadinessInput } from "../monetization-readiness-input";
import type { MonetizationConfig } from "@/types";

const mockGetMembersByUserId = vi.fn();

vi.mock("@/lib/core/di/container", () => ({
  getContainer: () => ({
    platformMemberRepo: {
      getMembersByUserId: (...args: unknown[]) =>
        mockGetMembersByUserId(...args),
    },
  }),
}));

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

const config: MonetizationConfig = {
  selectedModels: ["paid_membership"],
  completedAt: "2026-01-01T00:00:00.000Z",
};

describe("buildReadinessInput", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns zeroed community stats when there are no members", async () => {
    mockGetMembersByUserId.mockResolvedValue([]);

    const input = await buildReadinessInput("user_1", config);

    expect(input.selectedModels).toEqual(["paid_membership"]);
    expect(input.community.memberCount).toBe(0);
    expect(input.community.professionalMemberCount).toBe(0);
    expect(input.community.engagementRate).toBe(0);
    expect(input.community.avgReachPerPost).toBe(0);
    expect(input.community.weeksActive).toBe(0);
  });

  it("counts professional members by tag regex", async () => {
    mockGetMembersByUserId.mockResolvedValue([
      {
        tags: ["senior engineer"],
        firstSeenAt: new Date(),
        engagementCount: 2,
      },
      { tags: ["hobbyist"], firstSeenAt: new Date(), engagementCount: 1 },
      {
        tags: ["product manager"],
        firstSeenAt: new Date(),
        engagementCount: 3,
      },
      { tags: null, firstSeenAt: new Date(), engagementCount: 0 },
    ]);

    const input = await buildReadinessInput("user_1", config);

    expect(input.community.memberCount).toBe(4);
    expect(input.community.professionalMemberCount).toBe(2);
  });

  it("computes weeksActive from the earliest firstSeenAt", async () => {
    const sixWeeksAgo = new Date(Date.now() - 6 * MS_PER_WEEK);
    const recent = new Date();
    mockGetMembersByUserId.mockResolvedValue([
      { tags: [], firstSeenAt: sixWeeksAgo, engagementCount: 0 },
      { tags: [], firstSeenAt: recent, engagementCount: 0 },
    ]);

    const input = await buildReadinessInput("user_1", config);
    expect(input.community.weeksActive).toBe(6);
  });

  it("treats members missing firstSeenAt as 'now' (0 weeks)", async () => {
    mockGetMembersByUserId.mockResolvedValue([
      { tags: [], engagementCount: 0 },
    ]);

    const input = await buildReadinessInput("user_1", config);
    expect(input.community.weeksActive).toBe(0);
  });

  it("computes engagement rate and clamps it to 1", async () => {
    // 2 members, total engagement 100 -> 100 / (2*10) = 5 -> clamped to 1
    mockGetMembersByUserId.mockResolvedValue([
      { tags: [], firstSeenAt: new Date(), engagementCount: 60 },
      { tags: [], firstSeenAt: new Date(), engagementCount: 40 },
    ]);

    const input = await buildReadinessInput("user_1", config);
    expect(input.community.engagementRate).toBe(1);
  });

  it("computes a fractional engagement rate below the clamp", async () => {
    // 2 members, total 4 -> 4 / 20 = 0.2
    mockGetMembersByUserId.mockResolvedValue([
      { tags: [], firstSeenAt: new Date(), engagementCount: 1 },
      { tags: [], firstSeenAt: new Date(), engagementCount: 3 },
    ]);

    const input = await buildReadinessInput("user_1", config);
    expect(input.community.engagementRate).toBeCloseTo(0.2, 5);
  });

  it("defaults missing engagementCount to 0", async () => {
    mockGetMembersByUserId.mockResolvedValue([
      { tags: [], firstSeenAt: new Date() },
    ]);

    const input = await buildReadinessInput("user_1", config);
    expect(input.community.engagementRate).toBe(0);
  });

  it("sets nicheDefined true when at least one model is selected", async () => {
    mockGetMembersByUserId.mockResolvedValue([
      { tags: [], firstSeenAt: new Date(), engagementCount: 0 },
    ]);

    const input = await buildReadinessInput("user_1", config);
    expect(input.community.nicheDefined).toBe(true);
  });

  it("sets nicheDefined false when no models are selected", async () => {
    mockGetMembersByUserId.mockResolvedValue([
      { tags: [], firstSeenAt: new Date(), engagementCount: 0 },
    ]);

    const input = await buildReadinessInput("user_1", {
      ...config,
      selectedModels: [],
    });
    expect(input.community.nicheDefined).toBe(false);
  });

  it("sets avgReachPerPost equal to member count and a default transformationClarity", async () => {
    mockGetMembersByUserId.mockResolvedValue([
      { tags: [], firstSeenAt: new Date(), engagementCount: 0 },
      { tags: [], firstSeenAt: new Date(), engagementCount: 0 },
      { tags: [], firstSeenAt: new Date(), engagementCount: 0 },
    ]);

    const input = await buildReadinessInput("user_1", config);
    expect(input.community.avgReachPerPost).toBe(3);
    expect(input.community.transformationClarity).toBe("vague");
  });
});
