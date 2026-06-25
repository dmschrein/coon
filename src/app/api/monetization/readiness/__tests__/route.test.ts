import { CLAUDE_MODEL } from "@/lib/model";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../route";
import type { ReadinessOutput, MonetizationConfig } from "@/types";

const mockAuth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
}));

const mockGetCache = vi.fn();
const mockUpsertCache = vi.fn();
const mockGetConfig = vi.fn();
const mockExecuteStep = vi.fn();

vi.mock("@/lib/core/di/container", () => ({
  getContainer: () => ({
    monetizationReadinessRepo: {
      getCache: (...args: unknown[]) => mockGetCache(...args),
      upsertCache: (...args: unknown[]) => mockUpsertCache(...args),
    },
    monetizationConfigRepo: {
      getConfig: (...args: unknown[]) => mockGetConfig(...args),
    },
    monetizationPipeline: {
      executeStep: (...args: unknown[]) => mockExecuteStep(...args),
    },
  }),
}));

const mockAgent = vi.fn();
vi.mock("@/lib/agents/monetization-readiness", () => ({
  assessMonetizationReadiness: (...args: unknown[]) => mockAgent(...args),
}));

vi.mock("@/lib/agents/monetization-readiness-input", () => ({
  buildReadinessInput: vi.fn().mockResolvedValue({
    selectedModels: ["paid_membership"],
    community: {
      memberCount: 600,
      weeksActive: 12,
      avgReachPerPost: 2000,
      engagementRate: 0.15,
      nicheDefined: true,
      transformationClarity: "clear",
    },
  }),
}));

vi.mock("@/lib/agents/utils", () => ({
  logAgentRun: vi.fn().mockResolvedValue(undefined),
}));

function createRequest(): Request {
  return new Request("http://localhost:3000/api/monetization/readiness");
}

const config: MonetizationConfig = {
  selectedModels: ["paid_membership"],
  completedAt: "2026-05-01T12:00:00.000Z",
};

const cachedResult: ReadinessOutput = {
  models: [
    {
      name: "paid_membership",
      score: 78,
      benchmark: "500+ members + 8+ weeks active",
      topActions: ["Survey members", "Launch tier", "Iterate pricing"],
      readyToLaunch: true,
    },
  ],
  overallScore: 78,
  summary: "Ready to launch paid membership.",
};

const freshResult: ReadinessOutput = {
  ...cachedResult,
  summary: "Freshly computed.",
};

describe("GET /api/monetization/readiness", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExecuteStep.mockImplementation(
      async (
        _type: string,
        input: unknown,
        agentFn: (i: unknown) => Promise<{ data: unknown; tokensUsed: number }>
      ) => {
        const r = await agentFn(input);
        return {
          data: r.data,
          tokensUsed: r.tokensUsed,
          durationMs: 1,
          cached: false,
        };
      }
    );
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const response = await GET(createRequest());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
    expect(body.data).toBeNull();
    expect(mockAgent).not.toHaveBeenCalled();
  });

  it("returns cached result without calling the agent when cache is younger than 7 days", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockGetCache.mockResolvedValue({
      cache: cachedResult,
      updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    });

    const response = await GET(createRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual(cachedResult);
    expect(body.error).toBeNull();
    expect(mockAgent).not.toHaveBeenCalled();
    expect(mockExecuteStep).not.toHaveBeenCalled();
    expect(mockUpsertCache).not.toHaveBeenCalled();
  });

  it("calls the agent and upserts cache when cache is older than 7 days", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockGetCache.mockResolvedValue({
      cache: cachedResult,
      updatedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
    });
    mockGetConfig.mockResolvedValue(config);
    mockAgent.mockResolvedValue({
      result: freshResult,
      modelUsed: CLAUDE_MODEL,
      tokensUsed: 1500,
    });

    const response = await GET(createRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual(freshResult);
    expect(body.error).toBeNull();
    expect(mockAgent).toHaveBeenCalledTimes(1);
    expect(mockUpsertCache).toHaveBeenCalledWith("user_123", freshResult);
  });

  it("calls the agent when no cache exists at all", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockGetCache.mockResolvedValue({ cache: null, updatedAt: null });
    mockGetConfig.mockResolvedValue(config);
    mockAgent.mockResolvedValue({
      result: freshResult,
      modelUsed: CLAUDE_MODEL,
      tokensUsed: 1500,
    });

    const response = await GET(createRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual(freshResult);
    expect(mockAgent).toHaveBeenCalledTimes(1);
    expect(mockUpsertCache).toHaveBeenCalledWith("user_123", freshResult);
  });

  it("returns 400 VALIDATION_ERROR when the user has no monetization config", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockGetCache.mockResolvedValue({ cache: null, updatedAt: null });
    mockGetConfig.mockResolvedValue(null);

    const response = await GET(createRequest());
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(mockAgent).not.toHaveBeenCalled();
  });
});
