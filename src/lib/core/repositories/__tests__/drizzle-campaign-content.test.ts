import { describe, it, expect, beforeEach, vi } from "vitest";
import { DrizzleCampaignContentRepository } from "../drizzle-campaign-content";
import { CampaignContentEntity } from "../../domain/content";
import { makeFakeDb, type FakeRow } from "./fake-db";

beforeEach(() => vi.clearAllMocks());

function row(overrides: Partial<FakeRow> = {}): FakeRow {
  return {
    id: "cc1",
    campaignId: "camp1",
    userId: "user_123",
    platform: "twitter",
    status: "complete",
    contentData: { text: "hi" },
    tokensUsed: 10,
    errorMessage: null,
    createdAt: new Date("2026-05-01T00:00:00Z"),
    approvalStatus: "approved",
    title: "Title",
    pillar: "education",
    body: "Body",
    scheduledFor: null,
    mediaSuggestions: null,
    externalPostId: null,
    externalPostUrl: null,
    contentType: "post",
    eventTitle: null,
    eventDatetime: null,
    eventRsvpUrl: null,
    ...overrides,
  };
}

describe("DrizzleCampaignContentRepository", () => {
  describe("findById", () => {
    it("returns a domain entity when found", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([row()]);
      const repo = new DrizzleCampaignContentRepository(db);

      const result = await repo.findById("cc1");

      expect(result).toBeInstanceOf(CampaignContentEntity);
      expect(result?.id).toBe("cc1");
    });

    it("returns null when not found", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([]);
      const repo = new DrizzleCampaignContentRepository(db);

      expect(await repo.findById("x")).toBeNull();
    });

    it("applies defaults for nullish columns", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([
        row({
          createdAt: null,
          approvalStatus: null,
          title: null,
          pillar: null,
          body: null,
          contentType: null,
        }),
      ]);
      const repo = new DrizzleCampaignContentRepository(db);

      const result = await repo.findById("cc1");

      expect(result?.createdAt).toBeInstanceOf(Date);
      expect(result?.approvalStatus).toBe("pending_review");
      expect(result?.contentType).toBe("post");
    });
  });

  describe("findByCampaignId", () => {
    it("maps all rows", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([row(), row({ id: "cc2" })]);
      const repo = new DrizzleCampaignContentRepository(db);

      const rows = await repo.findByCampaignId("camp1");

      expect(rows.map((r) => r.id)).toEqual(["cc1", "cc2"]);
    });
  });

  describe("createMany", () => {
    it("returns [] without inserting when items is empty", async () => {
      const { db, captured } = makeFakeDb();
      const repo = new DrizzleCampaignContentRepository(db);

      const ids = await repo.createMany([]);

      expect(ids).toEqual([]);
      expect(captured.insertValues).toBeUndefined();
    });

    it("inserts mapped values and returns ids", async () => {
      const { db, queue, captured } = makeFakeDb();
      queue.insert.push([{ id: "new1" }, { id: "new2" }]);
      const repo = new DrizzleCampaignContentRepository(db);

      const ids = await repo.createMany([
        { campaignId: "camp1", userId: "user_123", platform: "twitter" },
        {
          campaignId: "camp1",
          userId: "user_123",
          platform: "instagram",
          pillar: "p",
          title: "t",
          body: "b",
          status: "pending" as never,
          contentType: "event",
          eventTitle: "E",
        },
      ]);

      expect(ids).toEqual(["new1", "new2"]);
      const values = captured.insertValues as FakeRow[];
      expect(values).toHaveLength(2);
      expect(values[0]).toMatchObject({
        platform: "twitter",
        status: "pending",
        contentType: "post",
      });
      expect(values[1]).toMatchObject({
        eventTitle: "E",
        contentType: "event",
      });
    });
  });

  describe("updateStatus", () => {
    it("sets status and errorMessage", async () => {
      const { db, queue, captured } = makeFakeDb();
      queue.update.push([]);
      const repo = new DrizzleCampaignContentRepository(db);

      await repo.updateStatus("cc1", "failed", "boom");

      expect(captured.updateSet).toMatchObject({
        status: "failed",
        errorMessage: "boom",
      });
    });

    it("defaults errorMessage to null", async () => {
      const { db, queue, captured } = makeFakeDb();
      queue.update.push([]);
      const repo = new DrizzleCampaignContentRepository(db);

      await repo.updateStatus("cc1", "complete");

      expect((captured.updateSet as FakeRow).errorMessage).toBeNull();
    });
  });

  describe("updateContent", () => {
    it("sets content complete and clears error", async () => {
      const { db, queue, captured } = makeFakeDb();
      queue.update.push([]);
      const repo = new DrizzleCampaignContentRepository(db);

      await repo.updateContent("cc1", { x: 1 }, 42);

      expect(captured.updateSet).toMatchObject({
        contentData: { x: 1 },
        status: "complete",
        tokensUsed: 42,
        errorMessage: null,
      });
    });
  });

  describe("updateApprovalStatus", () => {
    it("sets approval status", async () => {
      const { db, queue, captured } = makeFakeDb();
      queue.update.push([]);
      const repo = new DrizzleCampaignContentRepository(db);

      await repo.updateApprovalStatus("cc1", "approved" as never);

      expect(captured.updateSet).toMatchObject({ approvalStatus: "approved" });
    });
  });

  describe("bulkUpdateApprovalStatus", () => {
    it("no-ops on empty ids", async () => {
      const { db, captured } = makeFakeDb();
      const repo = new DrizzleCampaignContentRepository(db);

      await repo.bulkUpdateApprovalStatus([], "approved" as never);

      expect(captured.updateSet).toBeUndefined();
    });

    it("updates when ids present", async () => {
      const { db, queue, captured } = makeFakeDb();
      queue.update.push([]);
      const repo = new DrizzleCampaignContentRepository(db);

      await repo.bulkUpdateApprovalStatus(["a", "b"], "rejected" as never);

      expect(captured.updateSet).toMatchObject({ approvalStatus: "rejected" });
    });
  });

  describe("updateBody / updateEnrichments / updateHashtags / updateTargetCommunity", () => {
    it("updateBody sets body", async () => {
      const { db, queue, captured } = makeFakeDb();
      queue.update.push([]);
      const repo = new DrizzleCampaignContentRepository(db);
      await repo.updateBody("cc1", "new body");
      expect(captured.updateSet).toMatchObject({ body: "new body" });
    });

    it("updateEnrichments sets mediaSuggestions", async () => {
      const { db, queue, captured } = makeFakeDb();
      queue.update.push([]);
      const repo = new DrizzleCampaignContentRepository(db);
      await repo.updateEnrichments("cc1", { media: 1 });
      expect(captured.updateSet).toMatchObject({
        mediaSuggestions: { media: 1 },
      });
    });

    it("updateHashtags sets hashtags", async () => {
      const { db, queue, captured } = makeFakeDb();
      queue.update.push([]);
      const repo = new DrizzleCampaignContentRepository(db);
      await repo.updateHashtags("cc1", ["#a"]);
      expect(captured.updateSet).toMatchObject({ hashtags: ["#a"] });
    });

    it("updateTargetCommunity sets targetCommunity", async () => {
      const { db, queue, captured } = makeFakeDb();
      queue.update.push([]);
      const repo = new DrizzleCampaignContentRepository(db);
      await repo.updateTargetCommunity("cc1", "indie");
      expect(captured.updateSet).toMatchObject({ targetCommunity: "indie" });
    });
  });

  describe("updateContentPiece", () => {
    it("rounds confidence to an integer percentage and sets complete", async () => {
      const { db, queue, captured } = makeFakeDb();
      queue.update.push([]);
      const repo = new DrizzleCampaignContentRepository(db);

      await repo.updateContentPiece("cc1", {
        body: "b",
        hashtags: ["#x"],
        mediaSuggestions: null,
        aiConfidenceScore: 0.876,
        targetCommunity: "c",
        contentData: { a: 1 },
        tokensUsed: 7,
      });

      const set = captured.updateSet as FakeRow;
      expect(set.aiConfidenceScore).toBe(88);
      expect(set.status).toBe("complete");
      expect(set.approvalStatus).toBe("pending_review");
    });
  });

  describe("delete", () => {
    it("issues a delete", async () => {
      const { db, captured } = makeFakeDb();
      const repo = new DrizzleCampaignContentRepository(db);
      await repo.delete("cc1");
      expect(captured.deleteCalled).toBe(true);
    });
  });

  describe("updateSchedule", () => {
    it("sets scheduledFor and approved", async () => {
      const { db, queue, captured } = makeFakeDb();
      queue.update.push([]);
      const repo = new DrizzleCampaignContentRepository(db);
      const when = new Date("2026-07-01");
      await repo.updateSchedule("cc1", when);
      expect(captured.updateSet).toMatchObject({
        scheduledFor: when,
        approvalStatus: "approved",
      });
    });
  });

  describe("bulkUpdateSchedule", () => {
    it("no-ops on empty ids", async () => {
      const { db, captured } = makeFakeDb();
      const repo = new DrizzleCampaignContentRepository(db);
      await repo.bulkUpdateSchedule([], new Date());
      expect(captured.updateSet).toBeUndefined();
    });

    it("updates when ids present", async () => {
      const { db, queue, captured } = makeFakeDb();
      queue.update.push([]);
      const repo = new DrizzleCampaignContentRepository(db);
      const when = new Date("2026-07-01");
      await repo.bulkUpdateSchedule(["a"], when);
      expect(captured.updateSet).toMatchObject({ scheduledFor: when });
    });
  });

  describe("updateLastEngagementFetch", () => {
    it("sets lastEngagementFetch", async () => {
      const { db, queue, captured } = makeFakeDb();
      queue.update.push([]);
      const repo = new DrizzleCampaignContentRepository(db);
      const ts = new Date("2026-07-02");
      await repo.updateLastEngagementFetch("cc1", ts);
      expect(captured.updateSet).toMatchObject({ lastEngagementFetch: ts });
    });
  });

  describe("findStalePublished", () => {
    it("maps rows and non-null external post ids", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([
        {
          id: "cc1",
          campaignId: "camp1",
          userId: "user_123",
          platform: "twitter",
          externalPostId: "ext1",
        },
      ]);
      const repo = new DrizzleCampaignContentRepository(db);

      const rows = await repo.findStalePublished(24);

      expect(rows).toEqual([
        {
          id: "cc1",
          campaignId: "camp1",
          userId: "user_123",
          platform: "twitter",
          externalPostId: "ext1",
        },
      ]);
    });
  });

  describe("findRecentByUserId", () => {
    it("returns the raw select rows", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([
        { id: "cc1", title: "T", platform: "twitter", pillar: "p" },
      ]);
      const repo = new DrizzleCampaignContentRepository(db);

      const rows = await repo.findRecentByUserId("user_123", 5);

      expect(rows).toHaveLength(1);
      expect(rows[0].id).toBe("cc1");
    });
  });
});
