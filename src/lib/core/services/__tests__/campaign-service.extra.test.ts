import { CLAUDE_MODEL } from "@/lib/model";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CampaignService } from "../campaign-service";
import { Campaign } from "../../domain/campaign";
import { CampaignContentEntity } from "../../domain/content";
import { AudienceProfileEntity } from "../../domain/audience-profile";
import { audienceProfileFixture } from "@/lib/agents/__fixtures__/audience";
import { quizFixture } from "@/lib/agents/__fixtures__/quiz";
import { campaignStrategyFixture } from "@/lib/agents/__fixtures__/campaign";
import type {
  CampaignRepository,
  AudienceProfileRepository,
  QuizResponseRepository,
  CampaignContentRepository,
  CalendarEntryRepository,
  AgentRunRepository,
} from "../../repositories/interfaces";
import type { CampaignGoal, CampaignDuration } from "@/types";

type MockRepo<T> = { [K in keyof T]: ReturnType<typeof vi.fn> };

function profile() {
  return new AudienceProfileEntity(
    "prof-1",
    "user-1",
    "quiz-1",
    audienceProfileFixture,
    "quiz_based",
    null,
    true,
    new Date()
  );
}

function content(
  id: string,
  overrides: Partial<{
    status: string;
    platform: string;
    userId: string;
    title: string | null;
    pillar: string | null;
    body: string | null;
    contentData: unknown;
    campaignId: string;
  }> = {}
): CampaignContentEntity {
  return new CampaignContentEntity(
    id,
    overrides.campaignId ?? "camp-1",
    overrides.userId ?? "user-1",
    (overrides.platform ?? "twitter") as never,
    (overrides.status ?? "pending") as never,
    overrides.contentData ?? null,
    null,
    null,
    new Date(),
    "pending_review",
    overrides.title ?? "Title",
    overrides.pillar ?? "growth",
    overrides.body ?? "body"
  );
}

function draftCampaign(overrides: Partial<Campaign> = {}) {
  const c = Campaign.create({
    id: "camp-1",
    userId: "user-1",
    selectedPlatforms: ["twitter", "linkedin"],
    audienceProfileId: "prof-1",
    quizResponseId: "quiz-1",
    name: "My Campaign",
    goal: "build-awareness" as CampaignGoal,
    topic: "AI tooling",
    duration: "4-weeks" as CampaignDuration,
    frequencyConfig: { twitter: 3, linkedin: 2 },
  });
  return Object.assign(c, overrides);
}

describe("CampaignService — extra coverage", () => {
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
  let campaignGeneratorAgent: {
    generateCampaignPlan: ReturnType<typeof vi.fn>;
  };
  let cohesionCheckerAgent: {
    checkCampaignCohesion: ReturnType<typeof vi.fn>;
  };
  let contentPieceAgent: { generateContentPiece: ReturnType<typeof vi.fn> };

  function buildService() {
    return new CampaignService(
      campaignRepo as unknown as CampaignRepository,
      profileRepo as unknown as AudienceProfileRepository,
      quizRepo as unknown as QuizResponseRepository,
      contentRepo as unknown as CampaignContentRepository,
      calendarEntryRepo as unknown as CalendarEntryRepository,
      agentRunRepo as unknown as AgentRunRepository,
      strategyAgent as never,
      calendarAgent as never,
      contentAgent as never,
      campaignGeneratorAgent as never,
      cohesionCheckerAgent as never,
      contentPieceAgent as never
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
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
      updateCohesionResult: vi.fn(),
      delete: vi.fn(),
    };
    profileRepo = {
      findActiveByUserId: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      deactivateAllForUser: vi.fn(),
      updateProfileData: vi.fn(),
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
      delete: vi.fn(),
      updateSchedule: vi.fn(),
      bulkUpdateSchedule: vi.fn(),
      updateHashtags: vi.fn(),
      updateTargetCommunity: vi.fn(),
      updateLastEngagementFetch: vi.fn(),
      findStalePublished: vi.fn(),
      findRecentByUserId: vi.fn(),
    };
    calendarEntryRepo = {
      findByCampaignId: vi.fn(),
      createMany: vi.fn(),
      deleteFutureByRitual: vi.fn(),
    };
    agentRunRepo = { log: vi.fn(), getMetrics: vi.fn() };
    strategyAgent = { generateCampaignStrategy: vi.fn() };
    calendarAgent = { generateCampaignCalendar: vi.fn() };
    contentAgent = { generatePlatformBatch: vi.fn(), getNextBatch: vi.fn() };
    campaignGeneratorAgent = { generateCampaignPlan: vi.fn() };
    cohesionCheckerAgent = { checkCampaignCohesion: vi.fn() };
    contentPieceAgent = { generateContentPiece: vi.fn() };
  });

  // ─── createDraftCampaign ───────────────────────────────────────────────────

  describe("createDraftCampaign", () => {
    const input = {
      name: "Draft",
      goal: "build-awareness" as CampaignGoal,
      topic: "AI",
      platforms: ["twitter"] as never,
      duration: "4-weeks" as CampaignDuration,
      frequencyConfig: { twitter: 3 },
    };

    it("creates a draft campaign", async () => {
      profileRepo.findActiveByUserId.mockResolvedValue(profile());
      quizRepo.findLatestByUserId.mockResolvedValue({
        id: "quiz-1",
        responseData: quizFixture,
      });
      const created = draftCampaign();
      campaignRepo.create.mockResolvedValue(created);

      const result = await buildService().createDraftCampaign("user-1", input);

      expect(result).toBe(created);
      expect(campaignRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: "draft", strategyData: null })
      );
    });

    it("throws NO_PROFILE", async () => {
      profileRepo.findActiveByUserId.mockResolvedValue(null);
      await expect(
        buildService().createDraftCampaign("user-1", input)
      ).rejects.toThrow("No audience profile found");
    });

    it("throws NO_QUIZ_RESPONSE", async () => {
      profileRepo.findActiveByUserId.mockResolvedValue(profile());
      quizRepo.findLatestByUserId.mockResolvedValue(null);
      await expect(
        buildService().createDraftCampaign("user-1", input)
      ).rejects.toThrow("No quiz response found");
    });
  });

  // ─── generatePlan ──────────────────────────────────────────────────────────

  describe("generatePlan", () => {
    const planOutput = {
      strategySummary: "the summary",
      contentPillars: [{ theme: "growth", description: "grow" }],
      contentPlan: [
        {
          platform: "twitter",
          pillar: "growth",
          title: "Post A",
          scheduledDay: 1,
          contentType: "educational",
        },
      ],
    };

    it("generates a plan and creates content rows", async () => {
      campaignRepo.findById.mockResolvedValue(draftCampaign());
      profileRepo.findActiveByUserId.mockResolvedValue(profile());
      quizRepo.findLatestByUserId.mockResolvedValue({
        id: "quiz-1",
        responseData: quizFixture,
      });
      campaignGeneratorAgent.generateCampaignPlan.mockResolvedValue({
        output: planOutput,
        modelUsed: CLAUDE_MODEL,
        tokensUsed: 500,
      });

      const result = await buildService().generatePlan("camp-1", "user-1");

      expect(result).toBe(planOutput);
      expect(campaignRepo.updatePlan).toHaveBeenCalledWith(
        "camp-1",
        "the summary",
        planOutput.contentPillars,
        500
      );
      expect(contentRepo.createMany).toHaveBeenCalledWith([
        expect.objectContaining({ platform: "twitter", title: "Post A" }),
      ]);
      expect(agentRunRepo.log).toHaveBeenCalledWith(
        expect.objectContaining({ status: "success" })
      );
    });

    it("throws NOT_FOUND when campaign missing", async () => {
      campaignRepo.findById.mockResolvedValue(null);
      await expect(
        buildService().generatePlan("camp-1", "user-1")
      ).rejects.toThrow("Campaign not found");
    });

    it("throws INVALID_STATE when not in a generatable state", async () => {
      const c = draftCampaign();
      c.status = "complete";
      campaignRepo.findById.mockResolvedValue(c);
      await expect(
        buildService().generatePlan("camp-1", "user-1")
      ).rejects.toThrow("draft or strategy_pending");
    });

    it("throws NO_PROFILE", async () => {
      campaignRepo.findById.mockResolvedValue(draftCampaign());
      profileRepo.findActiveByUserId.mockResolvedValue(null);
      await expect(
        buildService().generatePlan("camp-1", "user-1")
      ).rejects.toThrow("No audience profile found");
    });

    it("throws NO_QUIZ_RESPONSE", async () => {
      campaignRepo.findById.mockResolvedValue(draftCampaign());
      profileRepo.findActiveByUserId.mockResolvedValue(profile());
      quizRepo.findLatestByUserId.mockResolvedValue(null);
      await expect(
        buildService().generatePlan("camp-1", "user-1")
      ).rejects.toThrow("No quiz response found");
    });

    it("logs failure and throws AGENT_FAILED when the generator throws", async () => {
      campaignRepo.findById.mockResolvedValue(draftCampaign());
      profileRepo.findActiveByUserId.mockResolvedValue(profile());
      quizRepo.findLatestByUserId.mockResolvedValue({
        id: "quiz-1",
        responseData: quizFixture,
      });
      campaignGeneratorAgent.generateCampaignPlan.mockRejectedValue(
        new Error("gen down")
      );

      await expect(
        buildService().generatePlan("camp-1", "user-1")
      ).rejects.toThrow("Failed to generate campaign plan");
      expect(agentRunRepo.log).toHaveBeenCalledWith(
        expect.objectContaining({ status: "failed", errorMessage: "gen down" })
      );
    });
  });

  // ─── generateFullCampaign ──────────────────────────────────────────────────

  describe("generateFullCampaign", () => {
    const planOutput = {
      strategySummary: "summary",
      contentPillars: [{ theme: "growth", description: "g" }],
      contentPlan: [
        {
          platform: "twitter",
          pillar: "growth",
          title: "Post A",
          scheduledDay: 1,
          contentType: "educational",
        },
      ],
    };

    it("throws NOT_CONFIGURED when no content piece agent", async () => {
      const svc = new CampaignService(
        campaignRepo as never,
        profileRepo as never,
        quizRepo as never,
        contentRepo as never,
        calendarEntryRepo as never,
        agentRunRepo as never,
        strategyAgent as never,
        calendarAgent as never,
        contentAgent as never,
        campaignGeneratorAgent as never
        // no contentPieceAgent
      );
      await expect(
        svc.generateFullCampaign("camp-1", "user-1")
      ).rejects.toThrow("Content piece agent not configured");
    });

    it("throws NOT_FOUND when campaign missing", async () => {
      campaignRepo.findById.mockResolvedValue(null);
      await expect(
        buildService().generateFullCampaign("camp-1", "user-1")
      ).rejects.toThrow("Campaign not found");
    });

    it("throws INVALID_STATE when not a draft", async () => {
      const c = draftCampaign();
      c.status = "complete";
      campaignRepo.findById.mockResolvedValue(c);
      await expect(
        buildService().generateFullCampaign("camp-1", "user-1")
      ).rejects.toThrow("must be in draft status");
    });

    it("throws NO_PROFILE", async () => {
      campaignRepo.findById.mockResolvedValue(draftCampaign());
      profileRepo.findActiveByUserId.mockResolvedValue(null);
      await expect(
        buildService().generateFullCampaign("camp-1", "user-1")
      ).rejects.toThrow("No audience profile found");
    });

    it("marks campaign failed and returns when strategy phase throws", async () => {
      campaignRepo.findById.mockResolvedValue(draftCampaign());
      profileRepo.findActiveByUserId.mockResolvedValue(profile());
      quizRepo.findLatestByUserId.mockResolvedValue({
        id: "quiz-1",
        responseData: quizFixture,
      });
      campaignGeneratorAgent.generateCampaignPlan.mockRejectedValue(
        new Error("strategy down")
      );

      await buildService().generateFullCampaign("camp-1", "user-1");

      expect(campaignRepo.updateStatus).toHaveBeenCalledWith(
        "camp-1",
        "generating"
      );
      expect(campaignRepo.updateStatus).toHaveBeenCalledWith(
        "camp-1",
        "failed"
      );
      expect(agentRunRepo.log).toHaveBeenCalledWith(
        expect.objectContaining({ status: "failed" })
      );
    });

    it("runs strategy + content phases and marks complete (with one piece failure)", async () => {
      campaignRepo.findById.mockResolvedValue(draftCampaign());
      profileRepo.findActiveByUserId.mockResolvedValue(profile());
      quizRepo.findLatestByUserId.mockResolvedValue({
        id: "quiz-1",
        responseData: quizFixture,
      });
      campaignGeneratorAgent.generateCampaignPlan.mockResolvedValue({
        output: planOutput,
        modelUsed: CLAUDE_MODEL,
        tokensUsed: 100,
      });
      // two pending rows -> one succeeds, one fails
      contentRepo.findByCampaignId.mockResolvedValue([
        content("c-1", { status: "pending", title: "Post A" }),
        content("c-2", { status: "pending", title: "Post B" }),
      ]);
      contentPieceAgent.generateContentPiece
        .mockResolvedValueOnce({
          output: {
            body: "generated",
            hashtags: ["#a"],
            mediaSuggestions: [],
            confidenceScore: 0.9,
            targetCommunity: "tc",
          },
          modelUsed: CLAUDE_MODEL,
          tokensUsed: 50,
        })
        .mockRejectedValueOnce(new Error("piece down"));

      await buildService().generateFullCampaign("camp-1", "user-1");

      expect(contentRepo.updateContentPiece).toHaveBeenCalledTimes(1);
      expect(contentRepo.updateStatus).toHaveBeenCalledWith(
        "c-2",
        "failed",
        "piece down"
      );
      expect(campaignRepo.updateCompletedPlatforms).toHaveBeenCalled();
      expect(campaignRepo.updateStatus).toHaveBeenCalledWith(
        "camp-1",
        "complete"
      );
    });
  });

  // ─── approval / scheduling delegators ──────────────────────────────────────

  describe("approval and scheduling delegators", () => {
    it("updateContentApproval delegates", async () => {
      await buildService().updateContentApproval("c-1", "approved");
      expect(contentRepo.updateApprovalStatus).toHaveBeenCalledWith(
        "c-1",
        "approved"
      );
    });

    it("bulkUpdateApproval delegates", async () => {
      await buildService().bulkUpdateApproval(["c-1", "c-2"], "rejected");
      expect(contentRepo.bulkUpdateApprovalStatus).toHaveBeenCalledWith(
        ["c-1", "c-2"],
        "rejected"
      );
    });

    it("bulkScheduleContent delegates", async () => {
      const d = new Date();
      await buildService().bulkScheduleContent(["c-1"], "user-1", d);
      expect(contentRepo.bulkUpdateSchedule).toHaveBeenCalledWith(["c-1"], d);
    });
  });

  // ─── getCachedCohesion ─────────────────────────────────────────────────────

  describe("getCachedCohesion", () => {
    it("returns cached result when hash matches", async () => {
      const c = draftCampaign();
      contentRepo.findByCampaignId.mockResolvedValue([
        content("c-1", { body: "x" }),
      ]);
      campaignRepo.findById.mockResolvedValue(c);
      // first compute the hash, then set it
      const probe = await buildService().getCachedCohesion("camp-1", "user-1");
      c.cohesionContentHash = probe.contentHash;
      c.cohesionResult = { overall_score: 88 };

      const result = await buildService().getCachedCohesion("camp-1", "user-1");
      expect(result.result).toEqual({ overall_score: 88 });
    });

    it("returns null result when no cache", async () => {
      campaignRepo.findById.mockResolvedValue(draftCampaign());
      contentRepo.findByCampaignId.mockResolvedValue([content("c-1")]);
      const result = await buildService().getCachedCohesion("camp-1", "user-1");
      expect(result.result).toBeNull();
      expect(result.contentHash).toEqual(expect.any(String));
    });

    it("throws NOT_FOUND when campaign missing", async () => {
      campaignRepo.findById.mockResolvedValue(null);
      await expect(
        buildService().getCachedCohesion("camp-1", "user-1")
      ).rejects.toThrow("Campaign not found");
    });
  });

  // ─── checkCohesion ─────────────────────────────────────────────────────────

  describe("checkCohesion", () => {
    it("throws NOT_CONFIGURED when no cohesion agent", async () => {
      const svc = new CampaignService(
        campaignRepo as never,
        profileRepo as never,
        quizRepo as never,
        contentRepo as never,
        calendarEntryRepo as never,
        agentRunRepo as never,
        strategyAgent as never,
        calendarAgent as never,
        contentAgent as never,
        campaignGeneratorAgent as never
        // no cohesion agent
      );
      await expect(svc.checkCohesion("camp-1", "user-1")).rejects.toThrow(
        "Cohesion checker not configured"
      );
    });

    it("throws NOT_FOUND when campaign missing", async () => {
      campaignRepo.findById.mockResolvedValue(null);
      await expect(
        buildService().checkCohesion("camp-1", "user-1")
      ).rejects.toThrow("Campaign not found");
    });

    it("runs the cohesion agent and persists the result", async () => {
      const c = draftCampaign();
      c.strategySummary = "summary";
      c.contentPillars = [
        {
          theme: "growth",
          description: "g",
          sampleTopics: [],
          targetedPainPoint: "",
        },
      ] as never;
      campaignRepo.findById.mockResolvedValue(c);
      contentRepo.findByCampaignId.mockResolvedValue([
        content("c-1", { contentData: { tweets: [] }, body: "b" }),
      ]);
      cohesionCheckerAgent.checkCampaignCohesion.mockResolvedValue({
        result: { overall_score: 91 },
        modelUsed: CLAUDE_MODEL,
        tokensUsed: 33,
      });

      const result = await buildService().checkCohesion("camp-1", "user-1");

      expect(result.cached).toBe(false);
      expect(result.result).toEqual({ overall_score: 91 });
      expect(campaignRepo.updateCohesionResult).toHaveBeenCalled();
      expect(agentRunRepo.log).toHaveBeenCalledWith(
        expect.objectContaining({ status: "success" })
      );
    });

    it("returns cached result without calling the agent when hash matches", async () => {
      const c = draftCampaign();
      contentRepo.findByCampaignId.mockResolvedValue([content("c-1")]);
      campaignRepo.findById.mockResolvedValue(c);
      const probe = await buildService().getCachedCohesion("camp-1", "user-1");
      c.cohesionContentHash = probe.contentHash;
      c.cohesionResult = { overall_score: 70 };

      const result = await buildService().checkCohesion("camp-1", "user-1");
      expect(result.cached).toBe(true);
      expect(cohesionCheckerAgent.checkCampaignCohesion).not.toHaveBeenCalled();
    });

    it("logs failure and throws AGENT_FAILED when cohesion agent throws", async () => {
      campaignRepo.findById.mockResolvedValue(draftCampaign());
      contentRepo.findByCampaignId.mockResolvedValue([content("c-1")]);
      cohesionCheckerAgent.checkCampaignCohesion.mockRejectedValue(
        new Error("cohesion down")
      );

      await expect(
        buildService().checkCohesion("camp-1", "user-1")
      ).rejects.toThrow("Failed to check campaign cohesion");
      expect(agentRunRepo.log).toHaveBeenCalledWith(
        expect.objectContaining({ status: "failed" })
      );
    });
  });

  // ─── updateCampaign / delete / content ops ─────────────────────────────────

  describe("updateCampaign", () => {
    it("updates fields and returns the updated campaign", async () => {
      campaignRepo.findById.mockResolvedValue(draftCampaign());
      const updated = draftCampaign({ name: "Renamed" } as never);
      campaignRepo.updateFields.mockResolvedValue(updated);

      const result = await buildService().updateCampaign("camp-1", "user-1", {
        name: "Renamed",
      });
      expect(result).toBe(updated);
      expect(campaignRepo.updateFields).toHaveBeenCalledWith(
        "camp-1",
        expect.objectContaining({ name: "Renamed" })
      );
    });

    it("throws NOT_FOUND when campaign missing", async () => {
      campaignRepo.findById.mockResolvedValue(null);
      await expect(
        buildService().updateCampaign("camp-1", "user-1", {})
      ).rejects.toThrow("Campaign not found");
    });

    it("throws INTERNAL_ERROR when update returns null", async () => {
      campaignRepo.findById.mockResolvedValue(draftCampaign());
      campaignRepo.updateFields.mockResolvedValue(null);
      await expect(
        buildService().updateCampaign("camp-1", "user-1", {})
      ).rejects.toThrow("Failed to update campaign");
    });
  });

  describe("deleteCampaign", () => {
    it("deletes an existing campaign", async () => {
      campaignRepo.findById.mockResolvedValue(draftCampaign());
      await buildService().deleteCampaign("camp-1", "user-1");
      expect(campaignRepo.delete).toHaveBeenCalledWith("camp-1");
    });

    it("throws NOT_FOUND when missing", async () => {
      campaignRepo.findById.mockResolvedValue(null);
      await expect(
        buildService().deleteCampaign("camp-1", "user-1")
      ).rejects.toThrow("Campaign not found");
    });
  });

  describe("deleteContent", () => {
    it("deletes owned content", async () => {
      contentRepo.findById.mockResolvedValue(content("c-1"));
      await buildService().deleteContent("c-1", "user-1");
      expect(contentRepo.delete).toHaveBeenCalledWith("c-1");
    });

    it("throws NOT_FOUND when content missing", async () => {
      contentRepo.findById.mockResolvedValue(null);
      await expect(
        buildService().deleteContent("c-1", "user-1")
      ).rejects.toThrow("Content not found");
    });

    it("throws UNAUTHORIZED for other user's content", async () => {
      contentRepo.findById.mockResolvedValue(
        content("c-1", { userId: "other" })
      );
      await expect(
        buildService().deleteContent("c-1", "user-1")
      ).rejects.toThrow("Unauthorized");
    });
  });

  describe("scheduleContent", () => {
    it("schedules owned content", async () => {
      const d = new Date();
      contentRepo.findById.mockResolvedValue(content("c-1"));
      await buildService().scheduleContent("c-1", "user-1", d);
      expect(contentRepo.updateSchedule).toHaveBeenCalledWith("c-1", d);
    });

    it("throws NOT_FOUND when missing", async () => {
      contentRepo.findById.mockResolvedValue(null);
      await expect(
        buildService().scheduleContent("c-1", "user-1", new Date())
      ).rejects.toThrow("Content not found");
    });

    it("throws UNAUTHORIZED for other user", async () => {
      contentRepo.findById.mockResolvedValue(content("c-1", { userId: "x" }));
      await expect(
        buildService().scheduleContent("c-1", "user-1", new Date())
      ).rejects.toThrow("Unauthorized");
    });
  });

  // ─── regenerateContent ─────────────────────────────────────────────────────

  describe("regenerateContent", () => {
    it("throws NOT_CONFIGURED without content piece agent", async () => {
      const svc = new CampaignService(
        campaignRepo as never,
        profileRepo as never,
        quizRepo as never,
        contentRepo as never,
        calendarEntryRepo as never,
        agentRunRepo as never,
        strategyAgent as never,
        calendarAgent as never,
        contentAgent as never,
        campaignGeneratorAgent as never
      );
      await expect(
        svc.regenerateContent("camp-1", "c-1", "user-1")
      ).rejects.toThrow("Content piece agent not configured");
    });

    it("throws NOT_FOUND when campaign missing", async () => {
      campaignRepo.findById.mockResolvedValue(null);
      await expect(
        buildService().regenerateContent("camp-1", "c-1", "user-1")
      ).rejects.toThrow("Campaign not found");
    });

    it("throws NOT_FOUND when content missing", async () => {
      campaignRepo.findById.mockResolvedValue(draftCampaign());
      contentRepo.findById.mockResolvedValue(null);
      await expect(
        buildService().regenerateContent("camp-1", "c-1", "user-1")
      ).rejects.toThrow("Content not found");
    });

    it("regenerates content using a synthesized strategy", async () => {
      const c = draftCampaign();
      c.strategySummary = "summary";
      campaignRepo.findById.mockResolvedValue(c);
      contentRepo.findById.mockResolvedValue(content("c-1"));
      profileRepo.findById.mockResolvedValue(profile());
      contentPieceAgent.generateContentPiece.mockResolvedValue({
        output: {
          body: "new body",
          hashtags: ["#x"],
          mediaSuggestions: [],
          confidenceScore: 0.8,
          targetCommunity: "tc",
        },
        modelUsed: CLAUDE_MODEL,
        tokensUsed: 20,
      });

      await buildService().regenerateContent("camp-1", "c-1", "user-1");

      expect(contentRepo.updateStatus).toHaveBeenCalledWith(
        "c-1",
        "generating"
      );
      expect(contentRepo.updateContentPiece).toHaveBeenCalledWith(
        "c-1",
        expect.objectContaining({ body: "new body" })
      );
      expect(agentRunRepo.log).toHaveBeenCalledWith(
        expect.objectContaining({ status: "success" })
      );
    });

    it("marks content failed and throws when piece agent errors", async () => {
      const c = draftCampaign();
      c.strategy = campaignStrategyFixture;
      campaignRepo.findById.mockResolvedValue(c);
      contentRepo.findById.mockResolvedValue(content("c-1"));
      profileRepo.findById.mockResolvedValue(profile());
      contentPieceAgent.generateContentPiece.mockRejectedValue(
        new Error("piece down")
      );

      await expect(
        buildService().regenerateContent("camp-1", "c-1", "user-1")
      ).rejects.toThrow("Failed to regenerate content");
      expect(contentRepo.updateStatus).toHaveBeenCalledWith(
        "c-1",
        "failed",
        "piece down"
      );
    });

    it("throws when audience profile is not found", async () => {
      const c = draftCampaign();
      campaignRepo.findById.mockResolvedValue(c);
      contentRepo.findById.mockResolvedValue(content("c-1"));
      profileRepo.findById.mockResolvedValue(null);
      await expect(
        buildService().regenerateContent("camp-1", "c-1", "user-1")
      ).rejects.toThrow("Audience profile not found");
    });

    it("throws when campaign has no audienceProfileId", async () => {
      const c = new Campaign(
        "camp-1",
        "user-1",
        "n",
        "draft",
        ["twitter"],
        [],
        null,
        null,
        0,
        null, // audienceProfileId null
        "quiz-1",
        new Date()
      );
      campaignRepo.findById.mockResolvedValue(c);
      contentRepo.findById.mockResolvedValue(content("c-1"));
      await expect(
        buildService().regenerateContent("camp-1", "c-1", "user-1")
      ).rejects.toThrow("Audience profile not found");
    });

    it("regenerates using synthesized strategy when campaign has null fields", async () => {
      const c = new Campaign(
        "camp-1",
        "user-1",
        null, // name
        "draft",
        ["twitter"],
        [],
        null, // strategy
        null,
        0,
        "prof-1",
        "quiz-1",
        new Date(),
        null, // goal
        null, // topic
        null, // duration
        null, // frequencyConfig
        null, // strategySummary
        null // contentPillars
      );
      campaignRepo.findById.mockResolvedValue(c);
      contentRepo.findById.mockResolvedValue(
        content("c-1", { title: null, pillar: null })
      );
      profileRepo.findById.mockResolvedValue(profile());
      contentPieceAgent.generateContentPiece.mockResolvedValue({
        output: {
          body: "b",
          // omit optional fields to exercise ?? defaults
        },
        modelUsed: CLAUDE_MODEL,
        tokensUsed: 5,
      });

      await buildService().regenerateContent("camp-1", "c-1", "user-1");

      expect(contentRepo.updateContentPiece).toHaveBeenCalledWith(
        "c-1",
        expect.objectContaining({
          hashtags: [],
          aiConfidenceScore: 0.7,
          targetCommunity: "",
        })
      );
    });
  });

  // ─── generateContentBatch ──────────────────────────────────────────────────

  describe("generateContentBatch", () => {
    function calendarReadyCampaign() {
      const c = draftCampaign();
      c.strategy = campaignStrategyFixture;
      c.status = "calendar_complete";
      return c;
    }

    it("throws NOT_FOUND when campaign missing", async () => {
      campaignRepo.findById.mockResolvedValue(null);
      await expect(
        buildService().generateContentBatch("camp-1", "user-1")
      ).rejects.toThrow("Campaign not found");
    });

    it("throws INVALID_STATE when calendar not ready", async () => {
      campaignRepo.findById.mockResolvedValue(draftCampaign());
      await expect(
        buildService().generateContentBatch("camp-1", "user-1")
      ).rejects.toThrow("calendar must be generated first");
    });

    it("throws NOTHING_TO_GENERATE when no pending content", async () => {
      campaignRepo.findById.mockResolvedValue(calendarReadyCampaign());
      contentRepo.findByCampaignId.mockResolvedValue([
        content("c-1", { status: "complete" }),
      ]);
      await expect(
        buildService().generateContentBatch("camp-1", "user-1")
      ).rejects.toThrow("All platform content already generated");
    });

    it("throws EMPTY_BATCH when getNextBatch returns empty", async () => {
      campaignRepo.findById.mockResolvedValue(calendarReadyCampaign());
      contentRepo.findByCampaignId.mockResolvedValue([
        content("c-1", { status: "pending", platform: "twitter" }),
      ]);
      contentAgent.getNextBatch.mockReturnValue([]);
      await expect(
        buildService().generateContentBatch("camp-1", "user-1")
      ).rejects.toThrow("No platforms to generate");
    });

    it("generates a batch, updates content, and marks complete when all done", async () => {
      const c = calendarReadyCampaign();
      campaignRepo.findById.mockResolvedValue(c);
      contentRepo.findByCampaignId
        .mockResolvedValueOnce([
          content("c-1", { status: "pending", platform: "twitter" }),
          content("c-2", { status: "pending", platform: "linkedin" }),
        ])
        // re-fetch after generation: both complete
        .mockResolvedValueOnce([
          content("c-1", { status: "complete", platform: "twitter" }),
          content("c-2", { status: "complete", platform: "linkedin" }),
        ]);
      contentAgent.getNextBatch.mockReturnValue(["twitter", "linkedin"]);
      profileRepo.findById.mockResolvedValue(profile());
      quizRepo.findLatestByUserId.mockResolvedValue({
        id: "quiz-1",
        responseData: quizFixture,
      });
      contentAgent.generatePlatformBatch.mockResolvedValue({
        results: [
          { platform: "twitter", content: { a: 1 }, tokensUsed: 10 },
          { platform: "linkedin", content: { b: 2 }, tokensUsed: 20 },
        ],
        errors: [],
      });

      const result = await buildService().generateContentBatch(
        "camp-1",
        "user-1"
      );

      expect(result.completed).toEqual(["twitter", "linkedin"]);
      expect(result.isComplete).toBe(true);
      expect(campaignRepo.updateStatus).toHaveBeenCalledWith(
        "camp-1",
        "complete"
      );
      expect(contentRepo.updateContent).toHaveBeenCalledTimes(2);
    });

    it("records partial failures and remaining platforms", async () => {
      const c = calendarReadyCampaign();
      campaignRepo.findById.mockResolvedValue(c);
      contentRepo.findByCampaignId
        .mockResolvedValueOnce([
          content("c-1", { status: "pending", platform: "twitter" }),
          content("c-2", { status: "pending", platform: "linkedin" }),
        ])
        .mockResolvedValueOnce([
          content("c-1", { status: "complete", platform: "twitter" }),
          content("c-2", { status: "failed", platform: "linkedin" }),
        ]);
      contentAgent.getNextBatch.mockReturnValue(["twitter", "linkedin"]);
      profileRepo.findById.mockResolvedValue(profile());
      quizRepo.findLatestByUserId.mockResolvedValue({
        id: "quiz-1",
        responseData: quizFixture,
      });
      contentAgent.generatePlatformBatch.mockResolvedValue({
        results: [{ platform: "twitter", content: { a: 1 }, tokensUsed: 10 }],
        errors: [{ platform: "linkedin", error: "boom" }],
      });

      const result = await buildService().generateContentBatch(
        "camp-1",
        "user-1"
      );

      expect(result.completed).toEqual(["twitter"]);
      expect(result.failed).toEqual(["linkedin"]);
      expect(result.remaining).toEqual(["linkedin"]);
      expect(result.isComplete).toBe(false);
      expect(contentRepo.updateStatus).toHaveBeenCalledWith(
        "c-2",
        "failed",
        "boom"
      );
    });

    it("marks the batch failed and throws when the content agent throws", async () => {
      const c = calendarReadyCampaign();
      campaignRepo.findById.mockResolvedValue(c);
      contentRepo.findByCampaignId.mockResolvedValue([
        content("c-1", { status: "pending", platform: "twitter" }),
      ]);
      contentAgent.getNextBatch.mockReturnValue(["twitter"]);
      profileRepo.findById.mockResolvedValue(profile());
      quizRepo.findLatestByUserId.mockResolvedValue({
        id: "quiz-1",
        responseData: quizFixture,
      });
      contentAgent.generatePlatformBatch.mockRejectedValue(
        new Error("batch down")
      );

      await expect(
        buildService().generateContentBatch("camp-1", "user-1")
      ).rejects.toThrow("Failed to generate content batch");
      expect(contentRepo.updateStatus).toHaveBeenCalledWith(
        "c-1",
        "failed",
        "batch down"
      );
    });

    it("throws NOT_FOUND when profile or quiz missing", async () => {
      const c = calendarReadyCampaign();
      campaignRepo.findById.mockResolvedValue(c);
      contentRepo.findByCampaignId.mockResolvedValue([
        content("c-1", { status: "pending", platform: "twitter" }),
      ]);
      contentAgent.getNextBatch.mockReturnValue(["twitter"]);
      profileRepo.findById.mockResolvedValue(null);
      quizRepo.findLatestByUserId.mockResolvedValue(null);

      await expect(
        buildService().generateContentBatch("camp-1", "user-1")
      ).rejects.toThrow("Profile or quiz not found");
    });

    it("synthesizes a strategy from null plan fields (exercises ?? defaults)", async () => {
      // No strategy, null name/summary/pillars/frequencyConfig -> all fallbacks.
      const c = new Campaign(
        "camp-1",
        "user-1",
        null, // name
        "calendar_complete",
        ["twitter"],
        [],
        null, // strategy
        null,
        0,
        "prof-1",
        "quiz-1",
        new Date(),
        null, // goal
        null, // topic
        null, // duration
        null, // frequencyConfig
        null, // strategySummary
        [{ theme: "p", description: "d" }] as never // contentPillars (allows canGenerateContent)
      );
      campaignRepo.findById.mockResolvedValue(c);
      contentRepo.findByCampaignId
        .mockResolvedValueOnce([
          content("c-1", { status: "pending", platform: "twitter" }),
        ])
        .mockResolvedValueOnce([
          content("c-1", { status: "complete", platform: "twitter" }),
        ]);
      contentAgent.getNextBatch.mockReturnValue(["twitter"]);
      profileRepo.findById.mockResolvedValue(profile());
      quizRepo.findLatestByUserId.mockResolvedValue({
        id: "quiz-1",
        responseData: quizFixture,
      });
      contentAgent.generatePlatformBatch.mockResolvedValue({
        results: [{ platform: "twitter", content: { a: 1 }, tokensUsed: 5 }],
        errors: [],
      });

      const result = await buildService().generateContentBatch(
        "camp-1",
        "user-1"
      );
      expect(result.isComplete).toBe(true);
      // synthesized strategy used "3x/week" default frequency
      expect(contentAgent.generatePlatformBatch).toHaveBeenCalledWith(
        ["twitter"],
        expect.objectContaining({ campaignName: "Campaign" }),
        expect.anything(),
        expect.anything()
      );
    });
  });

  // ─── extractContentTypeFromData via checkCohesion ──────────────────────────

  describe("extractContentTypeFromData branches (via checkCohesion)", () => {
    it.each<[Record<string, unknown> | null, string | null]>([
      [{ contentType: "poll" }, "poll"],
      [{ threadSeparated: true }, "thread"],
      [{ bodyMarkdown: "# hi" }, "article"],
      [{ script: "..." }, "video"],
      [{ subjectLine: "Hello" }, "article"],
      [{ misc: true }, "post"],
      [null, null],
    ])("maps contentData %o through cohesion", async (data) => {
      const c = draftCampaign();
      c.strategySummary = "summary";
      campaignRepo.findById.mockResolvedValue(c);
      contentRepo.findByCampaignId.mockResolvedValue([
        content("c-1", { contentData: data, body: "b" }),
      ]);
      cohesionCheckerAgent.checkCampaignCohesion.mockResolvedValue({
        result: { overall_score: 50 },
        modelUsed: CLAUDE_MODEL,
        tokensUsed: 1,
      });

      await buildService().checkCohesion("camp-1", "user-1");

      expect(cohesionCheckerAgent.checkCampaignCohesion).toHaveBeenCalledWith(
        expect.objectContaining({
          contentPieces: expect.arrayContaining([
            expect.objectContaining({ id: "c-1" }),
          ]),
        })
      );
    });
  });

  // ─── generateCalendar with synthesized strategy (null fields) ──────────────

  describe("generateCalendar synthesizes strategy from null fields", () => {
    it("uses fallback defaults when no strategy and null name/freq", async () => {
      const c = new Campaign(
        "camp-1",
        "user-1",
        null,
        "strategy_complete",
        ["twitter"],
        [],
        null, // strategy
        null,
        0,
        "prof-1",
        "quiz-1",
        new Date(),
        null,
        null,
        null,
        null,
        null,
        [{ theme: "p", description: "d" }] as never
      );
      campaignRepo.findById.mockResolvedValue(c);
      profileRepo.findById.mockResolvedValue(profile());
      calendarAgent.generateCampaignCalendar.mockResolvedValue({
        calendar: { totalPosts: 1, entries: [] },
        modelUsed: CLAUDE_MODEL,
        tokensUsed: 10,
      });

      await buildService().generateCalendar("camp-1", "user-1");

      expect(calendarAgent.generateCampaignCalendar).toHaveBeenCalledWith(
        expect.objectContaining({ campaignName: "Campaign" }),
        expect.anything()
      );
      expect(campaignRepo.updateCalendar).toHaveBeenCalled();
    });

    it("throws when audience profile not found", async () => {
      const c = draftCampaign();
      c.strategy = campaignStrategyFixture;
      c.status = "strategy_complete";
      campaignRepo.findById.mockResolvedValue(c);
      profileRepo.findById.mockResolvedValue(null);
      await expect(
        buildService().generateCalendar("camp-1", "user-1")
      ).rejects.toThrow("Audience profile not found");
    });

    it("logs failure and throws when the calendar agent throws", async () => {
      const c = draftCampaign();
      c.strategy = campaignStrategyFixture;
      c.status = "strategy_complete";
      campaignRepo.findById.mockResolvedValue(c);
      profileRepo.findById.mockResolvedValue(profile());
      calendarAgent.generateCampaignCalendar.mockRejectedValue(
        new Error("cal down")
      );
      await expect(
        buildService().generateCalendar("camp-1", "user-1")
      ).rejects.toThrow("Failed to generate campaign calendar");
      expect(agentRunRepo.log).toHaveBeenCalledWith(
        expect.objectContaining({ status: "failed" })
      );
    });

    it("throws when campaign has no audienceProfileId", async () => {
      const c = new Campaign(
        "camp-1",
        "user-1",
        "n",
        "strategy_complete",
        ["twitter"],
        [],
        campaignStrategyFixture,
        null,
        0,
        null, // audienceProfileId null
        "quiz-1",
        new Date()
      );
      campaignRepo.findById.mockResolvedValue(c);
      await expect(
        buildService().generateCalendar("camp-1", "user-1")
      ).rejects.toThrow("Audience profile not found");
    });
  });
});
