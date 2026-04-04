import { describe, it, expect, vi, beforeEach } from "vitest";
import { CampaignService } from "../campaign-service";
import { ServiceError } from "../audience-service";
import { Campaign } from "../../domain/campaign";
import { AudienceProfileEntity } from "../../domain/audience-profile";
import type {
  CampaignRepository,
  AudienceProfileRepository,
  QuizResponseRepository,
  CampaignContentRepository,
  CalendarEntryRepository,
  AgentRunRepository,
} from "../../repositories/interfaces";
import type { AudienceProfile, QuizResponse, CampaignStrategy } from "@/types";

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
  currentStage: "mvp",
  idealCustomer: "devs",
  industryNiche: ["tech"],
  preferredPlatforms: ["twitter"],
  businessModel: "b2b",
  budgetRange: "medium",
  primaryGoal: "pre-launch",
  launchTimeline: "2026-06-01T00:00:00.000Z",
  weeklyTimeCommitment: 10,
  contentComfortLevel: "intermediate",
};

const mockStrategy: CampaignStrategy = {
  campaignName: "Test Campaign",
  theme: "theme",
  goal: "goal",
  targetOutcome: "outcome",
  timelineWeeks: 4,
  messagingFramework: {
    coreMessage: "core",
    supportingMessages: ["msg"],
    toneGuidelines: "tone",
    keyPhrases: ["phrase"],
    avoidPhrases: ["avoid"],
  },
  platformAllocations: [
    {
      platform: "twitter",
      role: "primary",
      contentFocus: "engagement",
      frequencySuggestion: "3x/week",
      priorityOrder: 1,
    },
    {
      platform: "linkedin",
      role: "authority",
      contentFocus: "thought leadership",
      frequencySuggestion: "2x/week",
      priorityOrder: 2,
    },
  ],
  contentPillars: [
    {
      theme: "pillar",
      description: "desc",
      sampleTopics: ["topic"],
      targetedPainPoint: "pain",
    },
  ],
  audienceHooks: ["hook"],
};

type MockRepo<T> = { [K in keyof T]: ReturnType<typeof vi.fn> };

describe("CampaignService", () => {
  let campaignRepo: MockRepo<CampaignRepository>;
  let profileRepo: MockRepo<AudienceProfileRepository>;
  let quizRepo: MockRepo<QuizResponseRepository>;
  let contentRepo: MockRepo<CampaignContentRepository>;
  let calendarEntryRepo: MockRepo<CalendarEntryRepository>;
  let agentRunRepo: MockRepo<AgentRunRepository>;
  let strategyAgent: { generateCampaignStrategy: ReturnType<typeof vi.fn> };
  let calendarAgent: { generateCampaignCalendar: ReturnType<typeof vi.fn> };
  let contentAgent: {
    generatePlatformBatch: ReturnType<typeof vi.fn>;
    getNextBatch: ReturnType<typeof vi.fn>;
  };
  let service: CampaignService;

  beforeEach(() => {
    campaignRepo = {
      findById: vi.fn(),
      findByUserId: vi.fn(),
      save: vi.fn(),
      create: vi.fn(),
      updatePlan: vi.fn(),
      updateStrategy: vi.fn(),
      updateCalendar: vi.fn(),
      updateStatus: vi.fn(),
      updateCompletedPlatforms: vi.fn(),
      updateFields: vi.fn(),
      delete: vi.fn(),
    };
    profileRepo = {
      findActiveByUserId: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      deactivateAllForUser: vi.fn(),
    };
    quizRepo = { findLatestByUserId: vi.fn() };
    contentRepo = {
      findByCampaignId: vi.fn(),
      findById: vi.fn(),
      createMany: vi.fn(),
      updateStatus: vi.fn(),
      updateContent: vi.fn(),
      updateApprovalStatus: vi.fn(),
      bulkUpdateApprovalStatus: vi.fn(),
      updateBody: vi.fn(),
      updateEnrichments: vi.fn(),
      updateContentPiece: vi.fn(),
    };
    calendarEntryRepo = {
      findByCampaignId: vi.fn(),
      createMany: vi.fn(),
    };
    agentRunRepo = { log: vi.fn(), getMetrics: vi.fn() };
    strategyAgent = { generateCampaignStrategy: vi.fn() };
    calendarAgent = { generateCampaignCalendar: vi.fn() };
    contentAgent = {
      generatePlatformBatch: vi.fn(),
      getNextBatch: vi.fn(),
    };

    const campaignGeneratorAgent = { generateCampaignPlan: vi.fn() };

    service = new CampaignService(
      campaignRepo as unknown as CampaignRepository,
      profileRepo as unknown as AudienceProfileRepository,
      quizRepo as unknown as QuizResponseRepository,
      contentRepo as unknown as CampaignContentRepository,
      calendarEntryRepo as unknown as CalendarEntryRepository,
      agentRunRepo as unknown as AgentRunRepository,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      strategyAgent as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      calendarAgent as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      contentAgent as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      campaignGeneratorAgent as any
    );
  });

  describe("listCampaigns()", () => {
    it("delegates to repository", async () => {
      const campaigns = [
        Campaign.create({
          id: "c-1",
          userId: "u-1",
          selectedPlatforms: ["twitter"],
          audienceProfileId: "p-1",
          quizResponseId: "q-1",
        }),
      ];
      campaignRepo.findByUserId.mockResolvedValue(campaigns);

      const result = await service.listCampaigns("u-1");
      expect(result).toBe(campaigns);
    });
  });

  describe("getCampaign()", () => {
    it("returns campaign with content and calendar entries", async () => {
      const campaign = Campaign.create({
        id: "c-1",
        userId: "u-1",
        selectedPlatforms: ["twitter"],
        audienceProfileId: "p-1",
        quizResponseId: "q-1",
      });
      campaignRepo.findById.mockResolvedValue(campaign);
      contentRepo.findByCampaignId.mockResolvedValue([]);
      calendarEntryRepo.findByCampaignId.mockResolvedValue([]);

      const result = await service.getCampaign("c-1", "u-1");
      expect(result.campaign).toBe(campaign);
      expect(result.content).toEqual([]);
      expect(result.calendarEntries).toEqual([]);
    });

    it("throws NOT_FOUND when campaign missing", async () => {
      campaignRepo.findById.mockResolvedValue(null);

      await expect(service.getCampaign("c-1", "u-1")).rejects.toThrow(
        ServiceError
      );
    });
  });

  describe("createCampaign()", () => {
    it("creates campaign with strategy", async () => {
      const profile = AudienceProfileEntity.create({
        id: "p-1",
        userId: "u-1",
        quizResponseId: "q-1",
        profileData: mockProfileData,
      });
      profileRepo.findActiveByUserId.mockResolvedValue(profile);
      quizRepo.findLatestByUserId.mockResolvedValue({
        id: "q-1",
        responseData: mockQuizData,
      });

      strategyAgent.generateCampaignStrategy.mockResolvedValue({
        strategy: mockStrategy,
        modelUsed: "claude-sonnet-4-20250514",
        tokensUsed: 1000,
      });

      const createdCampaign = Campaign.create({
        id: "c-1",
        userId: "u-1",
        selectedPlatforms: ["twitter", "linkedin"],
        audienceProfileId: "p-1",
        quizResponseId: "q-1",
      });
      campaignRepo.create.mockResolvedValue(createdCampaign);

      const result = await service.createCampaign("u-1", [
        "twitter",
        "linkedin",
      ]);

      expect(result).toBe(createdCampaign);
      expect(strategyAgent.generateCampaignStrategy).toHaveBeenCalledWith(
        mockProfileData,
        mockQuizData,
        ["twitter", "linkedin"]
      );
      expect(contentRepo.createMany).toHaveBeenCalledWith([
        { campaignId: "c-1", userId: "u-1", platform: "twitter" },
        { campaignId: "c-1", userId: "u-1", platform: "linkedin" },
      ]);
      expect(agentRunRepo.log).toHaveBeenCalledWith(
        expect.objectContaining({
          agentType: "campaign_strategy",
          status: "success",
        })
      );
    });

    it("throws NO_PROFILE when no audience profile", async () => {
      profileRepo.findActiveByUserId.mockResolvedValue(null);

      await expect(service.createCampaign("u-1", ["twitter"])).rejects.toThrow(
        "No audience profile found"
      );
    });

    it("throws NO_QUIZ_RESPONSE when no quiz", async () => {
      profileRepo.findActiveByUserId.mockResolvedValue(
        AudienceProfileEntity.create({
          id: "p-1",
          userId: "u-1",
          quizResponseId: "q-1",
          profileData: mockProfileData,
        })
      );
      quizRepo.findLatestByUserId.mockResolvedValue(null);

      await expect(service.createCampaign("u-1", ["twitter"])).rejects.toThrow(
        "No quiz response found"
      );
    });

    it("logs failure when agent fails", async () => {
      profileRepo.findActiveByUserId.mockResolvedValue(
        AudienceProfileEntity.create({
          id: "p-1",
          userId: "u-1",
          quizResponseId: "q-1",
          profileData: mockProfileData,
        })
      );
      quizRepo.findLatestByUserId.mockResolvedValue({
        id: "q-1",
        responseData: mockQuizData,
      });
      strategyAgent.generateCampaignStrategy.mockRejectedValue(
        new Error("API error")
      );

      await expect(service.createCampaign("u-1", ["twitter"])).rejects.toThrow(
        ServiceError
      );

      expect(agentRunRepo.log).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "failed",
          errorMessage: "API error",
        })
      );
    });
  });

  describe("generateCalendar()", () => {
    it("generates calendar for strategy_complete campaign", async () => {
      const campaign = Campaign.create({
        id: "c-1",
        userId: "u-1",
        selectedPlatforms: ["twitter"],
        audienceProfileId: "p-1",
        quizResponseId: "q-1",
      });
      campaign.setStrategy(mockStrategy, 100);
      campaignRepo.findById.mockResolvedValue(campaign);

      const profile = AudienceProfileEntity.create({
        id: "p-1",
        userId: "u-1",
        quizResponseId: "q-1",
        profileData: mockProfileData,
      });
      profileRepo.findById.mockResolvedValue(profile);

      const mockCalendar = {
        startDate: "2025-01-01",
        endDate: "2025-01-28",
        totalPosts: 12,
        entries: [
          {
            dayNumber: 1,
            platform: "twitter",
            contentType: "educational",
            title: "Day 1",
            postingTime: "9 AM",
            pillar: "awareness",
          },
        ],
        weeklyOverview: [],
      };

      calendarAgent.generateCampaignCalendar.mockResolvedValue({
        calendar: mockCalendar,
        modelUsed: "claude-sonnet-4-20250514",
        tokensUsed: 800,
      });

      const result = await service.generateCalendar("c-1", "u-1");

      expect(result).toBe(mockCalendar);
      expect(campaignRepo.updateCalendar).toHaveBeenCalledWith(
        "c-1",
        mockCalendar,
        800
      );
      expect(calendarEntryRepo.createMany).toHaveBeenCalledWith([
        expect.objectContaining({
          campaignId: "c-1",
          dayNumber: 1,
          platform: "twitter",
        }),
      ]);
    });

    it("throws INVALID_STATE for strategy_pending campaign", async () => {
      const campaign = Campaign.create({
        id: "c-1",
        userId: "u-1",
        selectedPlatforms: ["twitter"],
        audienceProfileId: "p-1",
        quizResponseId: "q-1",
      });
      campaignRepo.findById.mockResolvedValue(campaign);

      await expect(service.generateCalendar("c-1", "u-1")).rejects.toThrow(
        "Campaign strategy must be generated first"
      );
    });
  });
});
