import { CLAUDE_MODEL } from "@/lib/model";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
}));

const mockGetSponsor = vi.fn();
const mockFindActiveByUserId = vi.fn();
const mockFindLatestByUserId = vi.fn();
vi.mock("@/lib/core/di/container", () => ({
  getContainer: () => ({
    sponsorRepo: {
      getSponsor: (...args: unknown[]) => mockGetSponsor(...args),
    },
    profileRepo: {
      findActiveByUserId: (...args: unknown[]) =>
        mockFindActiveByUserId(...args),
    },
    quizRepo: {
      findLatestByUserId: (...args: unknown[]) =>
        mockFindLatestByUserId(...args),
    },
  }),
}));

const mockGenerateSponsorPitch = vi.fn();
vi.mock("@/lib/agents/sponsor-pitch", () => ({
  generateSponsorPitch: (...args: unknown[]) =>
    mockGenerateSponsorPitch(...args),
}));

const mockBuildPitchAudienceMetrics = vi.fn();
vi.mock("@/lib/agents/sponsor-pitch-input", () => ({
  buildPitchAudienceMetrics: (...args: unknown[]) =>
    mockBuildPitchAudienceMetrics(...args),
}));

const mockLogAgentRun = vi.fn();
vi.mock("@/lib/agents/utils", () => ({
  logAgentRun: (...args: unknown[]) => mockLogAgentRun(...args),
}));

// Stub orchestration so queue.enqueue and circuitBreaker.execute just call through.
vi.mock("@/lib/orchestration", () => ({
  createOrchestration: () => ({
    queue: {
      enqueue: async ({ execute }: { execute: () => Promise<unknown> }) =>
        execute(),
    },
    circuitBreaker: {
      execute: async (fn: () => Promise<unknown>) => fn(),
    },
  }),
}));

import { POST } from "../route";

const mockSponsor = {
  id: "sponsor-1",
  userId: "user_123",
  companyName: "DevTools Inc",
  contactName: "Jane Buyer",
  contactEmail: null,
  dealValue: 250000,
  status: "outreach",
  deliverables: "1 sponsored post",
  startDate: null,
  endDate: null,
  notes: null,
  createdAt: new Date("2026-05-01T10:00:00Z"),
  updatedAt: new Date("2026-05-01T10:00:00Z"),
};

const mockProfile = {
  profileData: {
    primaryPersonas: [{ name: "Solo Founder", description: "" }],
    keywords: [],
  },
};

const mockQuiz = {
  responseData: {
    elevatorPitch: "AI community-building copilot",
    problemSolved: "Pre-launch isolation",
    idealCustomer: "Solo SaaS founders",
  },
};

function paramsFor(id: string) {
  return { params: Promise.resolve({ id }) };
}

function postRequest(): Request {
  return new Request(
    "http://localhost:3000/api/sponsors/sponsor-1/draft-pitch",
    { method: "POST" }
  );
}

describe("POST /api/sponsors/[id]/draft-pitch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const response = await POST(postRequest(), paramsFor("sponsor-1"));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 404 when sponsor belongs to another user", async () => {
    mockAuth.mockResolvedValue({ userId: "user_999" });
    mockGetSponsor.mockResolvedValue(mockSponsor);

    const response = await POST(postRequest(), paramsFor("sponsor-1"));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error.code).toBe("NOT_FOUND");
  });

  it("returns 422 NO_PROFILE when audience profile is missing", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockGetSponsor.mockResolvedValue(mockSponsor);
    mockFindActiveByUserId.mockResolvedValue(null);

    const response = await POST(postRequest(), paramsFor("sponsor-1"));
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.error.code).toBe("NO_PROFILE");
  });

  it("returns 422 NO_QUIZ_RESPONSE when quiz is missing", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockGetSponsor.mockResolvedValue(mockSponsor);
    mockFindActiveByUserId.mockResolvedValue(mockProfile);
    mockFindLatestByUserId.mockResolvedValue(null);

    const response = await POST(postRequest(), paramsFor("sponsor-1"));
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.error.code).toBe("NO_QUIZ_RESPONSE");
  });

  it("returns 422 NO_AUDIENCE_DATA when memberCount is 0", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockGetSponsor.mockResolvedValue(mockSponsor);
    mockFindActiveByUserId.mockResolvedValue(mockProfile);
    mockFindLatestByUserId.mockResolvedValue(mockQuiz);
    mockBuildPitchAudienceMetrics.mockResolvedValue({
      memberCount: 0,
      engagementRate: 0,
      primaryPlatforms: [],
    });

    const response = await POST(postRequest(), paramsFor("sponsor-1"));
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.error.code).toBe("NO_AUDIENCE_DATA");
  });

  it("returns 200 with subject/body/followUp on success", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockGetSponsor.mockResolvedValue(mockSponsor);
    mockFindActiveByUserId.mockResolvedValue(mockProfile);
    mockFindLatestByUserId.mockResolvedValue(mockQuiz);
    mockBuildPitchAudienceMetrics.mockResolvedValue({
      memberCount: 1247,
      engagementRate: 0.18,
      primaryPlatforms: ["twitter"],
    });
    mockGenerateSponsorPitch.mockResolvedValue({
      result: {
        subject: "Sponsor 1,247 founders",
        body: "Hi Jane — 1247 indie founders.",
        followUp: "Following up.",
      },
      modelUsed: CLAUDE_MODEL,
      tokensUsed: 800,
    });

    const response = await POST(postRequest(), paramsFor("sponsor-1"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.subject).toBe("Sponsor 1,247 founders");
    expect(data.data.body).toContain("1247");
    expect(data.data.followUp).toBe("Following up.");
    expect(data.data.modelUsed).toBe(CLAUDE_MODEL);
    expect(data.data.tokensUsed).toBe(800);
    expect(mockLogAgentRun).toHaveBeenCalledWith(
      expect.objectContaining({
        agentType: "sponsor_pitch",
        status: "success",
      })
    );
  });

  it("returns 500 AGENT_FAILED and logs the failure when the agent throws", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockGetSponsor.mockResolvedValue(mockSponsor);
    mockFindActiveByUserId.mockResolvedValue(mockProfile);
    mockFindLatestByUserId.mockResolvedValue(mockQuiz);
    mockBuildPitchAudienceMetrics.mockResolvedValue({
      memberCount: 1247,
      engagementRate: 0.18,
      primaryPlatforms: ["twitter"],
    });
    mockGenerateSponsorPitch.mockRejectedValue(new Error("Claude is on fire"));

    const response = await POST(postRequest(), paramsFor("sponsor-1"));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error.code).toBe("AGENT_FAILED");
    expect(mockLogAgentRun).toHaveBeenCalledWith(
      expect.objectContaining({
        agentType: "sponsor_pitch",
        status: "failed",
        errorMessage: "Claude is on fire",
      })
    );
  });
});
