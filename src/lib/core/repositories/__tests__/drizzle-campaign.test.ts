import { describe, it, expect, beforeEach, vi } from "vitest";
import { DrizzleCampaignRepository } from "../drizzle-campaign";
import { Campaign } from "../../domain/campaign";
import { makeFakeDb, type FakeRow } from "./fake-db";

beforeEach(() => vi.clearAllMocks());

function row(overrides: Partial<FakeRow> = {}): FakeRow {
  return {
    id: "camp1",
    userId: "user_123",
    name: "Launch",
    status: "draft",
    selectedPlatforms: ["twitter"],
    completedPlatforms: [],
    strategyData: { campaignName: "Launch" },
    calendarData: null,
    totalTokensUsed: 100,
    audienceProfileId: "ap1",
    quizResponseId: "qr1",
    createdAt: new Date("2026-05-01T00:00:00Z"),
    goal: "awareness",
    topic: "AI",
    duration: "30_days",
    frequencyConfig: { twitter: 3 },
    strategySummary: "summary",
    contentPillars: [],
    cohesionResult: null,
    cohesionContentHash: null,
    ...overrides,
  };
}

describe("DrizzleCampaignRepository", () => {
  describe("findById", () => {
    it("returns a Campaign domain object when found", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([row()]);
      const repo = new DrizzleCampaignRepository(db);

      const campaign = await repo.findById("camp1", "user_123");

      expect(campaign).toBeInstanceOf(Campaign);
      expect(campaign?.id).toBe("camp1");
      expect(campaign?.name).toBe("Launch");
    });

    it("returns null when not found", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([]);
      const repo = new DrizzleCampaignRepository(db);

      expect(await repo.findById("x", "user_123")).toBeNull();
    });

    it("applies defaults for nullish columns", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([
        row({
          selectedPlatforms: null,
          completedPlatforms: null,
          strategyData: null,
          calendarData: null,
          totalTokensUsed: null,
          createdAt: null,
          goal: null,
          topic: null,
          duration: null,
          frequencyConfig: null,
          strategySummary: null,
          contentPillars: null,
        }),
      ]);
      const repo = new DrizzleCampaignRepository(db);

      const campaign = await repo.findById("camp1", "user_123");

      expect(campaign?.selectedPlatforms).toEqual([]);
      expect(campaign?.totalTokensUsed).toBe(0);
      expect(campaign?.createdAt).toBeInstanceOf(Date);
    });
  });

  describe("findByUserId", () => {
    it("maps every row to a Campaign", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([row(), row({ id: "camp2" })]);
      const repo = new DrizzleCampaignRepository(db);

      const list = await repo.findByUserId("user_123");

      expect(list).toHaveLength(2);
      expect(list[1].id).toBe("camp2");
    });
  });

  describe("save", () => {
    it("issues an update with mutable fields and returns the campaign", async () => {
      const { db, queue, captured } = makeFakeDb();
      queue.update.push([]);
      const repo = new DrizzleCampaignRepository(db);
      const campaign = new Campaign(
        "camp1",
        "user_123",
        "Updated",
        "draft",
        ["twitter"],
        ["twitter"],
        { campaignName: "Updated" } as never,
        null,
        50,
        "ap1",
        "qr1",
        new Date(),
        null,
        null,
        null,
        null,
        "sum",
        null,
        null,
        null
      );

      const result = await repo.save(campaign);

      expect(result).toBe(campaign);
      expect(captured.updateSet).toMatchObject({
        name: "Updated",
        status: "draft",
        totalTokensUsed: 50,
      });
    });
  });

  describe("create", () => {
    it("inserts the supplied params and returns a Campaign", async () => {
      const { db, queue, captured } = makeFakeDb();
      queue.insert.push([row()]);
      const repo = new DrizzleCampaignRepository(db);

      const campaign = await repo.create({
        userId: "user_123",
        selectedPlatforms: ["twitter"],
        audienceProfileId: "ap1",
        quizResponseId: "qr1",
        name: "Launch",
        status: "draft",
        strategyData: null,
        totalTokensUsed: 0,
        goal: "build-awareness",
        topic: "AI",
        duration: "1-month",
        frequencyConfig: { twitter: 3 },
      });

      expect(campaign).toBeInstanceOf(Campaign);
      expect(captured.insertValues).toMatchObject({
        userId: "user_123",
        name: "Launch",
        goal: "build-awareness",
      });
    });
  });

  describe("updatePlan", () => {
    it("adds tokens to existing total and sets strategy_complete", async () => {
      const { db, queue, captured } = makeFakeDb();
      queue.select.push([row({ totalTokensUsed: 100 })]);
      queue.update.push([]);
      const repo = new DrizzleCampaignRepository(db);

      await repo.updatePlan("camp1", "summary", [], 50);

      expect(captured.updateSet).toMatchObject({
        strategySummary: "summary",
        status: "strategy_complete",
        totalTokensUsed: 150,
      });
    });

    it("no-ops when campaign does not exist", async () => {
      const { db, queue, captured } = makeFakeDb();
      queue.select.push([]);
      const repo = new DrizzleCampaignRepository(db);

      await repo.updatePlan("missing", "s", [], 10);

      expect(captured.updateSet).toBeUndefined();
    });

    it("treats null totalTokensUsed as 0", async () => {
      const { db, queue, captured } = makeFakeDb();
      queue.select.push([row({ totalTokensUsed: null })]);
      queue.update.push([]);
      const repo = new DrizzleCampaignRepository(db);

      await repo.updatePlan("camp1", "s", [], 30);

      expect((captured.updateSet as FakeRow).totalTokensUsed).toBe(30);
    });
  });

  describe("updateStrategy", () => {
    it("updates strategy and name, no-ops if missing", async () => {
      const { db, queue, captured } = makeFakeDb();
      queue.select.push([row({ totalTokensUsed: 10 })]);
      queue.update.push([]);
      const repo = new DrizzleCampaignRepository(db);

      await repo.updateStrategy(
        "camp1",
        { campaignName: "S" } as never,
        "Name",
        5
      );

      expect(captured.updateSet).toMatchObject({
        name: "Name",
        status: "strategy_complete",
        totalTokensUsed: 15,
      });
    });

    it("no-ops when not found", async () => {
      const { db, queue, captured } = makeFakeDb();
      queue.select.push([]);
      const repo = new DrizzleCampaignRepository(db);

      await repo.updateStrategy("x", {} as never, "N", 1);
      expect(captured.updateSet).toBeUndefined();
    });
  });

  describe("updateCalendar", () => {
    it("sets calendar_complete and adds tokens", async () => {
      const { db, queue, captured } = makeFakeDb();
      queue.select.push([row({ totalTokensUsed: 20 })]);
      queue.update.push([]);
      const repo = new DrizzleCampaignRepository(db);

      await repo.updateCalendar("camp1", { weeks: [] } as never, 5);

      expect(captured.updateSet).toMatchObject({
        status: "calendar_complete",
        totalTokensUsed: 25,
      });
    });

    it("no-ops when not found", async () => {
      const { db, queue, captured } = makeFakeDb();
      queue.select.push([]);
      const repo = new DrizzleCampaignRepository(db);

      await repo.updateCalendar("x", {} as never, 1);
      expect(captured.updateSet).toBeUndefined();
    });
  });

  describe("updateStatus", () => {
    it("sets the status", async () => {
      const { db, queue, captured } = makeFakeDb();
      queue.update.push([]);
      const repo = new DrizzleCampaignRepository(db);

      await repo.updateStatus("camp1", "published");

      expect(captured.updateSet).toMatchObject({ status: "published" });
    });
  });

  describe("updateCompletedPlatforms", () => {
    it("updates platforms and adds tokens", async () => {
      const { db, queue, captured } = makeFakeDb();
      queue.select.push([row({ totalTokensUsed: 5 })]);
      queue.update.push([]);
      const repo = new DrizzleCampaignRepository(db);

      await repo.updateCompletedPlatforms("camp1", ["twitter"], 3);

      expect(captured.updateSet).toMatchObject({
        completedPlatforms: ["twitter"],
        totalTokensUsed: 8,
      });
    });

    it("no-ops when not found", async () => {
      const { db, queue, captured } = makeFakeDb();
      queue.select.push([]);
      const repo = new DrizzleCampaignRepository(db);

      await repo.updateCompletedPlatforms("x", [], 1);
      expect(captured.updateSet).toBeUndefined();
    });
  });

  describe("updateFields", () => {
    it("updates only supplied fields and returns a Campaign", async () => {
      const { db, queue, captured } = makeFakeDb();
      queue.update.push([row({ name: "Renamed" })]);
      const repo = new DrizzleCampaignRepository(db);

      const result = await repo.updateFields("camp1", {
        name: "Renamed",
        goal: "growth",
        topic: "T",
        duration: "60_days",
        selectedPlatforms: ["instagram"],
        frequencyConfig: { instagram: 2 },
      });

      expect(result?.name).toBe("Renamed");
      const set = captured.updateSet as FakeRow;
      expect(set).toMatchObject({
        name: "Renamed",
        goal: "growth",
        selectedPlatforms: ["instagram"],
      });
    });

    it("returns null when no row updated", async () => {
      const { db, queue } = makeFakeDb();
      queue.update.push([]);
      const repo = new DrizzleCampaignRepository(db);

      expect(await repo.updateFields("x", { name: "n" })).toBeNull();
    });

    it("only sets updatedAt when no fields supplied", async () => {
      const { db, queue, captured } = makeFakeDb();
      queue.update.push([row()]);
      const repo = new DrizzleCampaignRepository(db);

      await repo.updateFields("camp1", {});

      const set = captured.updateSet as FakeRow;
      expect(Object.keys(set)).toEqual(["updatedAt"]);
    });
  });

  describe("updateCohesionResult", () => {
    it("stores result and hash", async () => {
      const { db, queue, captured } = makeFakeDb();
      queue.update.push([]);
      const repo = new DrizzleCampaignRepository(db);

      await repo.updateCohesionResult("camp1", { score: 1 }, "hash123");

      expect(captured.updateSet).toMatchObject({
        cohesionResult: { score: 1 },
        cohesionContentHash: "hash123",
      });
    });
  });

  describe("delete", () => {
    it("issues a delete", async () => {
      const { db, captured } = makeFakeDb();
      const repo = new DrizzleCampaignRepository(db);

      await repo.delete("camp1");

      expect(captured.deleteCalled).toBe(true);
    });
  });
});
