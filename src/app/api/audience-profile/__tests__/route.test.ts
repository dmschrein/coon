import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../route";
import { AudienceProfileEntity } from "@/lib/core/domain/audience-profile";
import type { AudienceProfile } from "@/types";

// Mock Clerk auth
const mockAuth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
}));

// Mock the DI container
const mockGetActiveProfile = vi.fn();
vi.mock("@/lib/core/di/container", () => ({
  getContainer: () => ({
    audienceService: {
      getActiveProfile: (...args: unknown[]) => mockGetActiveProfile(...args),
    },
  }),
}));

const mockProfileData: AudienceProfile = {
  primaryPersonas: [
    {
      name: "Test",
      description: "desc",
      painPoints: ["pain"],
      goals: ["goal"],
      objections: ["obj"],
      messagingAngle: "angle",
    },
  ],
  psychographics: {
    values: ["val"],
    motivations: ["mot"],
    frustrations: ["frus"],
    goals: ["goal"],
  },
  demographics: {
    ageRange: [25, 45],
    locations: ["US"],
    jobTitles: ["Dev"],
  },
  behavioralPatterns: {
    contentConsumption: ["blogs"],
    purchaseDrivers: ["recs"],
    decisionMakingProcess: "research",
  },
  keywords: ["keyword"],
  hashtags: ["#tag"],
};

describe("GET /api/audience-profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error.code).toBe("UNAUTHORIZED");
    expect(data.data).toBeNull();
  });

  it("returns profile when authenticated and profile exists", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });

    const profile = AudienceProfileEntity.create({
      id: "p-1",
      userId: "user_123",
      quizResponseId: "q-1",
      profileData: mockProfileData,
    });
    mockGetActiveProfile.mockResolvedValue(profile);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toBeTruthy();
    expect(data.error).toBeNull();
    expect(mockGetActiveProfile).toHaveBeenCalledWith("user_123");
  });

  it("returns null data when no profile exists", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockGetActiveProfile.mockResolvedValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toBeNull();
    expect(data.error).toBeNull();
  });

  it("returns 500 on unexpected error", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockGetActiveProfile.mockRejectedValue(new Error("DB connection failed"));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error.code).toBe("INTERNAL_ERROR");
  });
});
