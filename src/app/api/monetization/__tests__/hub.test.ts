import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GET } from "../hub/route";
import type {
  MonetizationConfig,
  ReadinessOutput,
  ModelReadiness,
} from "@/types";

const mockAuth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
}));

const mockGetConfig = vi.fn();
const mockGetCache = vi.fn();
const mockGetMRRSummary = vi.fn();
const mockGetPipelineValue = vi.fn();
const mockListTiers = vi.fn();

vi.mock("@/lib/core/di/container", () => ({
  getContainer: () => ({
    monetizationConfigRepo: {
      getConfig: (...args: unknown[]) => mockGetConfig(...args),
    },
    monetizationReadinessRepo: {
      getCache: (...args: unknown[]) => mockGetCache(...args),
    },
    revenueRepo: {
      getMRRSummary: (...args: unknown[]) => mockGetMRRSummary(...args),
    },
    sponsorRepo: {
      getPipelineValue: (...args: unknown[]) => mockGetPipelineValue(...args),
    },
    tierRepo: {
      listTiers: (...args: unknown[]) => mockListTiers(...args),
    },
  }),
}));

function createRequest(): Request {
  return new Request("http://localhost:3000/api/monetization/hub");
}

const config: MonetizationConfig = {
  selectedModels: ["paid_membership"],
  completedAt: "2026-05-01T12:00:00.000Z",
};

const readiness: ReadinessOutput = {
  models: [
    {
      name: "paid_membership",
      score: 78,
      benchmark: "500+ members",
      topActions: ["Survey members", "Launch tier", "Iterate pricing"],
      readyToLaunch: true,
    } satisfies ModelReadiness,
  ],
  overallScore: 78,
  summary: "Ready to launch.",
};

describe("GET /api/monetization/hub", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetConfig.mockResolvedValue(null);
    mockGetCache.mockResolvedValue({ cache: null, updatedAt: null });
    mockGetMRRSummary.mockResolvedValue({
      thisMonth: 0,
      lastMonth: 0,
      byType: {},
      monthlyTotals: [],
    });
    mockGetPipelineValue.mockResolvedValue(0);
    mockListTiers.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const response = await GET(createRequest());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
    expect(body.data).toBeNull();
  });

  it("calls all sub-queries via Promise.all in a single round-trip", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    const promiseAllSpy = vi.spyOn(Promise, "all");

    await GET(createRequest());

    expect(promiseAllSpy).toHaveBeenCalledTimes(1);
    const firstCallArg = promiseAllSpy.mock.calls[0][0];
    expect(Array.isArray(firstCallArg)).toBe(true);
    expect((firstCallArg as unknown[]).length).toBe(5);
  });

  it("returns null config, null readiness, and zeroed metrics for a new user", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });

    const response = await GET(createRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data).toEqual({
      config: null,
      readiness: null,
      revenueThisMonth: 0,
      pipelineValue: 0,
      activeTierCount: 0,
    });
  });

  it("returns revenueThisMonth from the revenue MRR summary", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockGetMRRSummary.mockResolvedValue({
      thisMonth: 125000,
      lastMonth: 80000,
      byType: {},
      monthlyTotals: [],
    });

    const response = await GET(createRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.revenueThisMonth).toBe(125000);
  });

  it("returns pipelineValue from the sponsor pipeline (active + negotiating)", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockGetPipelineValue.mockResolvedValue(450000);

    const response = await GET(createRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.pipelineValue).toBe(450000);
  });

  it("returns activeTierCount from the membership tier table", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockListTiers.mockResolvedValue([
      { id: "t1", isActive: true },
      { id: "t2", isActive: false },
      { id: "t3", isActive: true },
      { id: "t4", isActive: true },
    ]);

    const response = await GET(createRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.activeTierCount).toBe(3);
  });

  it("returns config and readiness alongside the metrics", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockGetConfig.mockResolvedValue(config);
    mockGetCache.mockResolvedValue({ cache: readiness, updatedAt: new Date() });
    mockGetMRRSummary.mockResolvedValue({
      thisMonth: 10000,
      lastMonth: 0,
      byType: {},
      monthlyTotals: [],
    });
    mockGetPipelineValue.mockResolvedValue(20000);
    mockListTiers.mockResolvedValue([{ id: "t1", isActive: true }]);

    const response = await GET(createRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.config).toEqual(config);
    expect(body.data.readiness).toEqual(readiness);
    expect(body.data.revenueThisMonth).toBe(10000);
    expect(body.data.pipelineValue).toBe(20000);
    expect(body.data.activeTierCount).toBe(1);
  });
});
