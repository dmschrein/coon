import { describe, it, expect, vi, beforeEach } from "vitest";
import { AudienceService, ServiceError } from "../audience-service";
import { AudienceProfileEntity } from "../../domain/audience-profile";
import type {
  AudienceProfileRepository,
  QuizResponseRepository,
  AgentRunRepository,
} from "../../repositories/interfaces";
import type { AudienceProfile, QuizResponse } from "@/types";

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

const mockQuizData: QuizResponse = {
  productType: "saas",
  elevatorPitch: "pitch",
  problemSolved: "problem",
  uniqueAngle: "angle",
  currentStage: "mvp",
  idealCustomer: "devs",
  industryNiche: ["tech"],
  customerPainPoints: ["pain"],
  currentSolutions: ["solution"],
  budgetRange: "medium",
  businessModel: "b2b",
  competitors: [],
  competitorStrengths: [],
  competitorWeaknesses: [],
  differentiators: ["diff"],
  launchTimeline: "3 months",
  targetAudienceSize: 1000,
  weeklyTimeCommitment: 10,
  preferredPlatforms: ["twitter"],
  contentComfortLevel: "intermediate",
};

describe("AudienceService", () => {
  let profileRepo: {
    [K in keyof AudienceProfileRepository]: ReturnType<typeof vi.fn>;
  };
  let quizRepo: {
    [K in keyof QuizResponseRepository]: ReturnType<typeof vi.fn>;
  };
  let agentRunRepo: {
    [K in keyof AgentRunRepository]: ReturnType<typeof vi.fn>;
  };
  let agent: { analyzeAudience: ReturnType<typeof vi.fn> };
  let service: AudienceService;

  beforeEach(() => {
    profileRepo = {
      findActiveByUserId: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      deactivateAllForUser: vi.fn(),
    };
    quizRepo = {
      findLatestByUserId: vi.fn(),
    };
    agentRunRepo = {
      log: vi.fn(),
      getMetrics: vi.fn(),
    };
    agent = {
      analyzeAudience: vi.fn(),
    };

    service = new AudienceService(
      profileRepo as unknown as AudienceProfileRepository,
      quizRepo as unknown as QuizResponseRepository,
      agentRunRepo as unknown as AgentRunRepository,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      agent as any
    );
  });

  describe("getActiveProfile()", () => {
    it("returns active profile from repo", async () => {
      const profile = AudienceProfileEntity.create({
        id: "p-1",
        userId: "u-1",
        quizResponseId: "q-1",
        profileData: mockProfileData,
      });
      profileRepo.findActiveByUserId.mockResolvedValue(profile);

      const result = await service.getActiveProfile("u-1");
      expect(result).toBe(profile);
      expect(profileRepo.findActiveByUserId).toHaveBeenCalledWith("u-1");
    });

    it("returns null when no profile exists", async () => {
      profileRepo.findActiveByUserId.mockResolvedValue(null);

      const result = await service.getActiveProfile("u-1");
      expect(result).toBeNull();
    });
  });

  describe("regenerateProfile()", () => {
    it("generates a new profile successfully", async () => {
      quizRepo.findLatestByUserId.mockResolvedValue({
        id: "q-1",
        responseData: mockQuizData,
      });

      agent.analyzeAudience.mockResolvedValue({
        profile: mockProfileData,
        modelUsed: "claude-sonnet-4-20250514",
        tokensUsed: 500,
      });

      const newProfile = AudienceProfileEntity.create({
        id: "p-new",
        userId: "u-1",
        quizResponseId: "q-1",
        profileData: mockProfileData,
      });
      profileRepo.create.mockResolvedValue(newProfile);

      const result = await service.regenerateProfile("u-1");

      expect(result).toBe(newProfile);
      expect(profileRepo.deactivateAllForUser).toHaveBeenCalledWith("u-1");
      expect(agent.analyzeAudience).toHaveBeenCalledWith(mockQuizData);
      expect(profileRepo.create).toHaveBeenCalledWith({
        userId: "u-1",
        quizResponseId: "q-1",
        profileData: mockProfileData,
      });
      expect(agentRunRepo.log).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "u-1",
          agentType: "audience_analysis",
          status: "success",
          tokensUsed: 500,
        })
      );
    });

    it("throws ServiceError when no quiz response", async () => {
      quizRepo.findLatestByUserId.mockResolvedValue(null);

      await expect(service.regenerateProfile("u-1")).rejects.toThrow(
        ServiceError
      );
      await expect(service.regenerateProfile("u-1")).rejects.toThrow(
        "No quiz response found"
      );
    });

    it("throws ServiceError when agent fails", async () => {
      quizRepo.findLatestByUserId.mockResolvedValue({
        id: "q-1",
        responseData: mockQuizData,
      });
      agent.analyzeAudience.mockRejectedValue(new Error("API timeout"));
      profileRepo.deactivateAllForUser.mockResolvedValue(undefined);

      await expect(service.regenerateProfile("u-1")).rejects.toThrow(
        ServiceError
      );

      // Should log the failure
      expect(agentRunRepo.log).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "failed",
          errorMessage: "API timeout",
        })
      );
    });
  });
});
