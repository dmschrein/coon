import { describe, it, expect, beforeEach, vi } from "vitest";
import { DrizzleEngagementRepository } from "../drizzle-engagement";
import { makeFakeDb, type FakeRow } from "./fake-db";

beforeEach(() => vi.clearAllMocks());

function row(overrides: Partial<FakeRow> = {}): FakeRow {
  return {
    id: "e1",
    campaignContentId: "cc1",
    platform: "twitter",
    platformPostId: "pp1",
    likes: 10,
    comments: 2,
    shares: 1,
    reach: 100,
    impressions: 200,
    engagementRate: "0.05",
    recordedAt: new Date("2026-05-01T00:00:00Z"),
    createdAt: new Date("2026-05-01T00:00:00Z"),
    ...overrides,
  };
}

const params = {
  campaignContentId: "cc1",
  platform: "twitter",
  platformPostId: "pp1",
  likes: 10,
  comments: 2,
  shares: 1,
  reach: 100,
  impressions: 200,
  engagementRate: "0.05",
  recordedAt: new Date("2026-05-01T00:00:00Z"),
};

describe("DrizzleEngagementRepository", () => {
  describe("upsertEngagement", () => {
    it("updates the existing record when found", async () => {
      const { db, queue, captured } = makeFakeDb();
      queue.select.push([row()]); // existing
      queue.update.push([row({ likes: 99 })]);
      const repo = new DrizzleEngagementRepository(db);

      const result = await repo.upsertEngagement({ ...params, likes: 99 });

      expect(result.likes).toBe(99);
      expect(captured.updateSet).toMatchObject({ likes: 99 });
    });

    it("inserts a new record when none exists", async () => {
      const { db, queue, captured } = makeFakeDb();
      queue.select.push([]); // no existing
      queue.insert.push([row()]);
      const repo = new DrizzleEngagementRepository(db);

      const result = await repo.upsertEngagement(params);

      expect(result.id).toBe("e1");
      expect(captured.insertValues).toMatchObject({ campaignContentId: "cc1" });
    });

    it("applies numeric defaults for nullish columns", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([]);
      queue.insert.push([
        row({
          likes: null,
          comments: null,
          shares: null,
          reach: null,
          impressions: null,
          createdAt: null,
        }),
      ]);
      const repo = new DrizzleEngagementRepository(db);

      const result = await repo.upsertEngagement(params);

      expect(result.likes).toBe(0);
      expect(result.impressions).toBe(0);
      expect(result.createdAt).toBeInstanceOf(Date);
    });
  });

  describe("getEngagementByContentId", () => {
    it("maps all rows", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([row(), row({ id: "e2" })]);
      const repo = new DrizzleEngagementRepository(db);

      const rows = await repo.getEngagementByContentId("cc1");

      expect(rows.map((r) => r.id)).toEqual(["e1", "e2"]);
    });
  });

  describe("getAverageEngagementRate", () => {
    it("returns null for empty id list", async () => {
      const { db } = makeFakeDb();
      const repo = new DrizzleEngagementRepository(db);
      expect(await repo.getAverageEngagementRate([])).toBeNull();
    });

    it("returns the parsed average", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([{ avg: "0.075" }]);
      const repo = new DrizzleEngagementRepository(db);

      expect(await repo.getAverageEngagementRate(["cc1", "cc2"])).toBeCloseTo(
        0.075
      );
    });

    it("returns null when avg is null", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([{ avg: null }]);
      const repo = new DrizzleEngagementRepository(db);

      expect(await repo.getAverageEngagementRate(["cc1"])).toBeNull();
    });

    it("returns null when avg is not finite", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([{ avg: "not-a-number" }]);
      const repo = new DrizzleEngagementRepository(db);

      expect(await repo.getAverageEngagementRate(["cc1"])).toBeNull();
    });
  });
});
