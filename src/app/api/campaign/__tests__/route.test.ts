import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "../route";
import { Campaign } from "@/lib/core/domain/campaign";
import { ServiceError } from "@/lib/core/services";

// Mock Clerk auth
const mockAuth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
}));

// Mock the DI container
const mockListCampaigns = vi.fn();
const mockCreateCampaign = vi.fn();
vi.mock("@/lib/core/di/container", () => ({
  getContainer: () => ({
    campaignService: {
      listCampaigns: (...args: unknown[]) => mockListCampaigns(...args),
      createCampaign: (...args: unknown[]) => mockCreateCampaign(...args),
    },
  }),
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
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error.code).toBe("UNAUTHORIZED");
  });

  it("returns campaigns for authenticated user", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    const mockCampaigns = [
      Campaign.create({
        id: "c-1",
        userId: "user_123",
        selectedPlatforms: ["twitter"],
        audienceProfileId: "p-1",
        quizResponseId: "q-1",
      }),
    ];
    mockListCampaigns.mockResolvedValue(mockCampaigns);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toHaveLength(1);
    expect(data.error).toBeNull();
    expect(mockListCampaigns).toHaveBeenCalledWith("user_123");
  });

  it("returns empty array when no campaigns exist", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockListCampaigns.mockResolvedValue([]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toEqual([]);
  });
});

describe("POST /api/campaign", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    mockCreateCampaign.mockRejectedValue(
      new ServiceError(
        "No audience profile found. Generate an audience profile first.",
        "NO_PROFILE"
      )
    );

    const response = await POST(
      createMockRequest({ selectedPlatforms: ["twitter"] })
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error.code).toBe("NO_PROFILE");
  });

  it("returns 400 when no quiz response exists", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockCreateCampaign.mockRejectedValue(
      new ServiceError("No quiz response found.", "NO_QUIZ_RESPONSE")
    );

    const response = await POST(
      createMockRequest({ selectedPlatforms: ["twitter"] })
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error.code).toBe("NO_QUIZ_RESPONSE");
  });

  it("creates campaign with strategy on success", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    const mockCampaign = Campaign.create({
      id: "c-1",
      userId: "user_123",
      selectedPlatforms: ["twitter", "linkedin"],
      audienceProfileId: "p-1",
      quizResponseId: "q-1",
    });
    mockCreateCampaign.mockResolvedValue(mockCampaign);

    const response = await POST(
      createMockRequest({ selectedPlatforms: ["twitter", "linkedin"] })
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toBeTruthy();
    expect(data.error).toBeNull();
    expect(mockCreateCampaign).toHaveBeenCalledWith("user_123", [
      "twitter",
      "linkedin",
    ]);
  });

  it("returns 500 when strategy generation fails", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockCreateCampaign.mockRejectedValue(
      new ServiceError(
        "Failed to generate campaign strategy. Please try again.",
        "AGENT_FAILED"
      )
    );

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
    await response.json();

    // Zod validation error triggers the outer catch
    expect(response.status).toBe(500);
  });
});
