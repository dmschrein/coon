import { describe, it, expect } from "vitest";
import { AudienceProfileEntity } from "../audience-profile";
import type { AudienceProfile } from "@/types";

const mockProfileData: AudienceProfile = {
  primaryPersonas: [
    {
      name: "Tech Tom",
      description: "A software engineer",
      painPoints: ["legacy code", "slow builds"],
      goals: ["ship faster", "code quality"],
      objections: ["too expensive"],
      messagingAngle: "Productivity focus",
    },
  ],
  psychographics: {
    values: ["efficiency"],
    motivations: ["career growth"],
    frustrations: ["slow tools"],
    goals: ["mastery"],
  },
  demographics: {
    ageRange: [25, 45],
    locations: ["US", "EU"],
    jobTitles: ["Software Engineer"],
    incomeRange: "$80k-150k",
  },
  behavioralPatterns: {
    contentConsumption: ["blog posts", "podcasts"],
    purchaseDrivers: ["recommendations"],
    decisionMakingProcess: "Research-driven",
  },
  keywords: ["developer tools", "productivity"],
  hashtags: ["#devtools", "#coding"],
};

describe("AudienceProfileEntity", () => {
  describe("create()", () => {
    it("creates an active profile", () => {
      const profile = AudienceProfileEntity.create({
        id: "profile-1",
        userId: "user-1",
        quizResponseId: "quiz-1",
        profileData: mockProfileData,
      });

      expect(profile.id).toBe("profile-1");
      expect(profile.isActive).toBe(true);
      expect(profile.userId).toBe("user-1");
    });
  });

  describe("getPersonas()", () => {
    it("returns primary personas", () => {
      const profile = AudienceProfileEntity.create({
        id: "profile-1",
        userId: "user-1",
        quizResponseId: "quiz-1",
        profileData: mockProfileData,
      });

      expect(profile.getPersonas()).toHaveLength(1);
      expect(profile.getPersonas()[0].name).toBe("Tech Tom");
    });
  });

  describe("getPersonaCount()", () => {
    it("returns persona count", () => {
      const profile = AudienceProfileEntity.create({
        id: "profile-1",
        userId: "user-1",
        quizResponseId: "quiz-1",
        profileData: mockProfileData,
      });

      expect(profile.getPersonaCount()).toBe(1);
    });
  });

  describe("hasValidData()", () => {
    it("returns true for valid profile", () => {
      const profile = AudienceProfileEntity.create({
        id: "profile-1",
        userId: "user-1",
        quizResponseId: "quiz-1",
        profileData: mockProfileData,
      });

      expect(profile.hasValidData()).toBe(true);
    });

    it("returns false for empty personas", () => {
      const profile = AudienceProfileEntity.create({
        id: "profile-1",
        userId: "user-1",
        quizResponseId: "quiz-1",
        profileData: { ...mockProfileData, primaryPersonas: [] },
      });

      expect(profile.hasValidData()).toBe(false);
    });
  });

  describe("activate/deactivate", () => {
    it("can deactivate and reactivate", () => {
      const profile = AudienceProfileEntity.create({
        id: "profile-1",
        userId: "user-1",
        quizResponseId: "quiz-1",
        profileData: mockProfileData,
      });

      expect(profile.isActive).toBe(true);
      profile.deactivate();
      expect(profile.isActive).toBe(false);
      profile.activate();
      expect(profile.isActive).toBe(true);
    });
  });

  describe("getAgeRange()", () => {
    it("returns demographics age range", () => {
      const profile = AudienceProfileEntity.create({
        id: "profile-1",
        userId: "user-1",
        quizResponseId: "quiz-1",
        profileData: mockProfileData,
      });

      expect(profile.getAgeRange()).toEqual([25, 45]);
    });
  });

  describe("getTopPainPoints()", () => {
    it("aggregates pain points from all personas", () => {
      const profile = AudienceProfileEntity.create({
        id: "profile-1",
        userId: "user-1",
        quizResponseId: "quiz-1",
        profileData: mockProfileData,
      });

      expect(profile.getTopPainPoints()).toEqual([
        "legacy code",
        "slow builds",
      ]);
    });
  });

  describe("getKeywords() and getHashtags()", () => {
    it("returns keywords and hashtags", () => {
      const profile = AudienceProfileEntity.create({
        id: "profile-1",
        userId: "user-1",
        quizResponseId: "quiz-1",
        profileData: mockProfileData,
      });

      expect(profile.getKeywords()).toEqual([
        "developer tools",
        "productivity",
      ]);
      expect(profile.getHashtags()).toEqual(["#devtools", "#coding"]);
    });
  });
});
