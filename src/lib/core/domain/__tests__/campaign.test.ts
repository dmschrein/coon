import { describe, it, expect } from "vitest";
import { Campaign, CampaignStateError } from "../campaign";
import type { CampaignStrategy, CampaignCalendar } from "@/types";

function createTestCampaign(
  _overrides?: Partial<ConstructorParameters<typeof Campaign>>
) {
  return Campaign.create({
    id: "campaign-1",
    userId: "user-1",
    selectedPlatforms: ["twitter", "linkedin", "blog"],
    audienceProfileId: "profile-1",
    quizResponseId: "quiz-1",
  });
}

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

const mockCalendar: CampaignCalendar = {
  startDate: "2025-01-01",
  endDate: "2025-01-28",
  totalPosts: 12,
  entries: [
    {
      dayNumber: 1,
      platform: "twitter",
      contentType: "educational",
      title: "Intro",
      postingTime: "9:00 AM",
      pillar: "awareness",
    },
  ],
  weeklyOverview: [{ week: 1, focus: "Intro", platforms: ["twitter"] }],
};

describe("Campaign", () => {
  describe("create()", () => {
    it("creates a campaign in strategy_pending state", () => {
      const campaign = createTestCampaign();
      expect(campaign.id).toBe("campaign-1");
      expect(campaign.userId).toBe("user-1");
      expect(campaign.status).toBe("strategy_pending");
      expect(campaign.name).toBeNull();
      expect(campaign.strategy).toBeNull();
      expect(campaign.calendar).toBeNull();
      expect(campaign.totalTokensUsed).toBe(0);
      expect(campaign.completedPlatforms).toEqual([]);
    });
  });

  describe("state guards", () => {
    it("canGenerateStrategy only in strategy_pending", () => {
      const campaign = createTestCampaign();
      expect(campaign.canGenerateStrategy()).toBe(true);

      campaign.setStrategy(mockStrategy, 100);
      expect(campaign.canGenerateStrategy()).toBe(false);
    });

    it("canGenerateCalendar only in strategy_complete with strategy", () => {
      const campaign = createTestCampaign();
      expect(campaign.canGenerateCalendar()).toBe(false);

      campaign.setStrategy(mockStrategy, 100);
      expect(campaign.canGenerateCalendar()).toBe(true);
    });

    it("canGenerateContent only after calendar_complete", () => {
      const campaign = createTestCampaign();
      expect(campaign.canGenerateContent()).toBe(false);

      campaign.setStrategy(mockStrategy, 100);
      expect(campaign.canGenerateContent()).toBe(false);

      campaign.setCalendar(mockCalendar, 50);
      expect(campaign.canGenerateContent()).toBe(true);
    });
  });

  describe("setStrategy()", () => {
    it("transitions to strategy_complete", () => {
      const campaign = createTestCampaign();
      campaign.setStrategy(mockStrategy, 100);

      expect(campaign.status).toBe("strategy_complete");
      expect(campaign.strategy).toBe(mockStrategy);
      expect(campaign.name).toBe("Test Campaign");
      expect(campaign.totalTokensUsed).toBe(100);
    });

    it("throws in wrong state", () => {
      const campaign = createTestCampaign();
      campaign.setStrategy(mockStrategy, 100);

      expect(() => campaign.setStrategy(mockStrategy, 50)).toThrow(
        CampaignStateError
      );
    });
  });

  describe("setCalendar()", () => {
    it("transitions to calendar_complete", () => {
      const campaign = createTestCampaign();
      campaign.setStrategy(mockStrategy, 100);
      campaign.setCalendar(mockCalendar, 50);

      expect(campaign.status).toBe("calendar_complete");
      expect(campaign.calendar).toBe(mockCalendar);
      expect(campaign.totalTokensUsed).toBe(150);
    });

    it("throws in wrong state", () => {
      const campaign = createTestCampaign();

      expect(() => campaign.setCalendar(mockCalendar, 50)).toThrow(
        CampaignStateError
      );
    });
  });

  describe("content generation", () => {
    it("markContentGenerating transitions to generating_content", () => {
      const campaign = createTestCampaign();
      campaign.setStrategy(mockStrategy, 100);
      campaign.setCalendar(mockCalendar, 50);
      campaign.markContentGenerating();

      expect(campaign.status).toBe("generating_content");
    });

    it("addCompletedPlatform tracks progress", () => {
      const campaign = createTestCampaign();
      campaign.setStrategy(mockStrategy, 100);
      campaign.setCalendar(mockCalendar, 50);
      campaign.markContentGenerating();

      campaign.addCompletedPlatform("twitter", 200);
      expect(campaign.completedPlatforms).toContain("twitter");
      expect(campaign.getProgress()).toBeCloseTo(1 / 3);
      expect(campaign.totalTokensUsed).toBe(350);
    });

    it("completes when all platforms done", () => {
      const campaign = createTestCampaign();
      campaign.setStrategy(mockStrategy, 100);
      campaign.setCalendar(mockCalendar, 50);
      campaign.markContentGenerating();

      campaign.addCompletedPlatform("twitter", 100);
      campaign.addCompletedPlatform("linkedin", 100);
      campaign.addCompletedPlatform("blog", 100);

      expect(campaign.status).toBe("complete");
      expect(campaign.isComplete()).toBe(true);
      expect(campaign.getProgress()).toBe(1);
    });

    it("throws when adding non-selected platform", () => {
      const campaign = createTestCampaign();
      campaign.setStrategy(mockStrategy, 100);
      campaign.setCalendar(mockCalendar, 50);
      campaign.markContentGenerating();

      expect(() => campaign.addCompletedPlatform("youtube", 100)).toThrow(
        CampaignStateError
      );
    });

    it("does not duplicate completed platforms", () => {
      const campaign = createTestCampaign();
      campaign.setStrategy(mockStrategy, 100);
      campaign.setCalendar(mockCalendar, 50);
      campaign.markContentGenerating();

      campaign.addCompletedPlatform("twitter", 100);
      campaign.addCompletedPlatform("twitter", 50);

      expect(
        campaign.completedPlatforms.filter((p) => p === "twitter")
      ).toHaveLength(1);
      // Tokens still accumulate
      expect(campaign.totalTokensUsed).toBe(300);
    });
  });

  describe("getRemainingPlatforms()", () => {
    it("returns platforms not yet completed", () => {
      const campaign = createTestCampaign();
      campaign.setStrategy(mockStrategy, 100);
      campaign.setCalendar(mockCalendar, 50);
      campaign.markContentGenerating();

      campaign.addCompletedPlatform("twitter", 100);

      const remaining = campaign.getRemainingPlatforms();
      expect(remaining).toEqual(["linkedin", "blog"]);
    });
  });

  describe("markFailed()", () => {
    it("sets status to failed", () => {
      const campaign = createTestCampaign();
      campaign.markFailed();

      expect(campaign.status).toBe("failed");
      expect(campaign.isFailed()).toBe(true);
    });
  });
});
