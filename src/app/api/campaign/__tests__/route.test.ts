import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "../route";

// Mock Clerk auth
const mockAuth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
}));

// Chainable mock that works as both a thenable (for .orderBy() terminal calls)
// and a chain (for .orderBy().limit() calls)
let selectResult: unknown[] = [];
let limitResults: unknown[][] = [];
let limitCallCount = 0;

function resetSelectMock(result: unknown[] = []) {
  selectResult = result;
  limitResults = [];
  limitCallCount = 0;
}

function setLimitResult(index: number, result: unknown[]) {
  limitResults[index] = result;
}

const mockInsert = vi.fn();
const mockInsertValues = vi.fn();
const mockInsertReturning = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => {
          const orderByResult = {
            // When used as a thenable (no .limit() call), resolve to selectResult
            then: (resolve: (v: unknown) => void) => resolve(selectResult),
            // When .limit() is chained after .orderBy()
            limit: () => {
              const idx = limitCallCount++;
              return limitResults[idx] ?? selectResult;
            },
          };
          return {
            orderBy: () => orderByResult,
          };
        },
        orderBy: () => {
          // For direct .from().orderBy() without .where()
          return {
            then: (resolve: (v: unknown) => void) => resolve(selectResult),
          };
        },
      }),
    }),
    insert: (...args: unknown[]) => {
      mockInsert(...args);
      return {
        values: (...args: unknown[]) => {
          mockInsertValues(...args);
          return {
            returning: () => mockInsertReturning(),
          };
        },
      };
    },
  },
}));

vi.mock("@/lib/db/schema", () => ({
  campaigns: { userId: "userId", createdAt: "createdAt" },
  campaignContent: {},
  audienceProfiles: {
    userId: "userId",
    isActive: "isActive",
    generatedAt: "generatedAt",
  },
  quizResponses: { userId: "userId", completedAt: "completedAt" },
  agentRuns: {},
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: unknown[]) => ({ type: "eq", args })),
  and: vi.fn((...args: unknown[]) => ({ type: "and", args })),
  desc: vi.fn((col: unknown) => ({ type: "desc", col })),
}));

// Mock the campaign strategy agent
const mockGenerateStrategy = vi.fn();
vi.mock("@/lib/agents/campaign-strategy", () => ({
  generateCampaignStrategy: (...args: unknown[]) =>
    mockGenerateStrategy(...args),
}));

// Mock logAgentRun
vi.mock("@/lib/agents/utils", () => ({
  logAgentRun: vi.fn(),
}));

function createMockRequest(body?: unknown): Request {
  return new Request("http://localhost:3000/api/campaign", {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("GET /api/campaign", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetSelectMock([]);
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const response = await GET(createMockRequest());
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error.code).toBe("UNAUTHORIZED");
  });

  it("returns campaigns for authenticated user", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    const mockCampaigns = [
      { id: "camp_1", name: "Campaign 1" },
      { id: "camp_2", name: "Campaign 2" },
    ];
    resetSelectMock(mockCampaigns);

    const response = await GET(createMockRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toEqual(mockCampaigns);
    expect(data.error).toBeNull();
  });

  it("returns empty array when no campaigns exist", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    resetSelectMock([]);

    const response = await GET(createMockRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toEqual([]);
  });
});

describe("POST /api/campaign", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetSelectMock([]);
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const response = await POST(
      createMockRequest({ selectedPlatforms: ["twitter"] })
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 400 when no audience profile exists", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });

    // .limit() returns empty for profile lookup
    resetSelectMock([]);

    const response = await POST(
      createMockRequest({ selectedPlatforms: ["twitter"] })
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error.code).toBe("NO_PROFILE");
  });

  it("returns 400 when no quiz response exists", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });

    const mockProfile = { id: "profile_1", profileData: {} };

    // First .limit() call returns profile, second returns empty (no quiz)
    resetSelectMock([]);
    setLimitResult(0, [mockProfile]);
    setLimitResult(1, []);

    const response = await POST(
      createMockRequest({ selectedPlatforms: ["twitter"] })
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error.code).toBe("NO_QUIZ_RESPONSE");
  });

  it("creates campaign with strategy on success", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });

    const mockProfile = { id: "profile_1", profileData: {} };
    const mockQuiz = { id: "quiz_1", responseData: {} };
    const mockCampaign = { id: "camp_1", name: "Test Campaign" };

    // First .limit(): profile, second: quiz
    resetSelectMock([]);
    setLimitResult(0, [mockProfile]);
    setLimitResult(1, [mockQuiz]);

    mockGenerateStrategy.mockResolvedValue({
      strategy: { campaignName: "Test Campaign" },
      modelUsed: "claude-sonnet-4-20250514",
      tokensUsed: 1500,
    });

    mockInsertReturning.mockReturnValue([mockCampaign]);

    const response = await POST(
      createMockRequest({ selectedPlatforms: ["twitter", "linkedin"] })
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toEqual(mockCampaign);
    expect(mockGenerateStrategy).toHaveBeenCalledTimes(1);
  });

  it("returns 500 when strategy generation fails", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });

    const mockProfile = { id: "profile_1", profileData: {} };
    const mockQuiz = { id: "quiz_1", responseData: {} };

    resetSelectMock([]);
    setLimitResult(0, [mockProfile]);
    setLimitResult(1, [mockQuiz]);

    mockGenerateStrategy.mockRejectedValue(new Error("Claude API error"));

    const response = await POST(
      createMockRequest({ selectedPlatforms: ["twitter"] })
    );
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error.code).toBe("AGENT_FAILED");
  });

  it("rejects request with empty selectedPlatforms", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });

    const response = await POST(createMockRequest({ selectedPlatforms: [] }));
    const data = await response.json();

    expect(response.status).toBe(500);
  });
});
