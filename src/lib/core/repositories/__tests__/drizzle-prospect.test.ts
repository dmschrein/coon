import { describe, it, expect, beforeEach, vi } from "vitest";
import { DrizzleProspectRepository } from "../drizzle-prospect";
import { makeFakeDb, type FakeRow } from "./fake-db";

type PerContentRow = {
  contentId: string;
  title: string | null;
  pillar: string | null;
  platform: string;
  joins: number;
};

// Fake Drizzle query chain that returns a fixed result when awaited.
function fakeDb(rows: PerContentRow[]) {
  const chain: Record<string, unknown> = {};
  for (const method of [
    "select",
    "from",
    "innerJoin",
    "where",
    "groupBy",
    "orderBy",
  ]) {
    chain[method] = () => chain;
  }
  // Make the chain awaitable
  (chain as unknown as PromiseLike<PerContentRow[]>).then = ((
    onFulfilled: (value: PerContentRow[]) => unknown
  ) => Promise.resolve(rows).then(onFulfilled)) as PromiseLike<
    PerContentRow[]
  >["then"];
  return chain;
}

describe("DrizzleProspectRepository.getGrowthAttribution", () => {
  it("returns empty state when no joined prospects exist", async () => {
    const repo = new DrizzleProspectRepository(fakeDb([]));

    const result = await repo.getGrowthAttribution("user_1");

    expect(result.topConvertingContent).toEqual([]);
    expect(result.topConvertingPlatform).toBeNull();
    expect(result.topConvertingPillar).toBeNull();
    expect(result.joinsByPillar).toEqual([]);
    expect(result.totalJoins).toBe(0);
  });

  it("aggregates joins across content pieces and pillars", async () => {
    const rows: PerContentRow[] = [
      {
        contentId: "c1",
        title: "A",
        pillar: "education",
        platform: "twitter",
        joins: 5,
      },
      {
        contentId: "c2",
        title: "B",
        pillar: "education",
        platform: "twitter",
        joins: 3,
      },
      {
        contentId: "c3",
        title: "C",
        pillar: "story",
        platform: "instagram",
        joins: 4,
      },
    ];
    const repo = new DrizzleProspectRepository(fakeDb(rows));

    const result = await repo.getGrowthAttribution("user_1");

    expect(result.totalJoins).toBe(12);
    expect(result.topConvertingPillar).toEqual({
      pillar: "education",
      joins: 8,
    });
    expect(result.topConvertingPlatform).toEqual({
      platform: "twitter",
      joins: 8,
    });
    expect(result.joinsByPillar).toEqual([
      { pillar: "education", joins: 8 },
      { pillar: "story", joins: 4 },
    ]);
  });

  it("caps topConvertingContent at 5 entries", async () => {
    const rows: PerContentRow[] = Array.from({ length: 7 }, (_, i) => ({
      contentId: `c${i}`,
      title: `Piece ${i}`,
      pillar: `pillar-${i}`,
      platform: "twitter",
      joins: 7 - i,
    }));
    const repo = new DrizzleProspectRepository(fakeDb(rows));

    const result = await repo.getGrowthAttribution("user_1");

    expect(result.topConvertingContent).toHaveLength(5);
    expect(result.topConvertingContent[0].contentId).toBe("c0");
    expect(result.topConvertingContent[4].contentId).toBe("c4");
    expect(result.joinsByPillar).toHaveLength(7);
  });

  it("groups null pillars under 'uncategorized'", async () => {
    const rows: PerContentRow[] = [
      {
        contentId: "c1",
        title: null,
        pillar: null,
        platform: "twitter",
        joins: 2,
      },
      {
        contentId: "c2",
        title: null,
        pillar: null,
        platform: "twitter",
        joins: 1,
      },
    ];
    const repo = new DrizzleProspectRepository(fakeDb(rows));

    const result = await repo.getGrowthAttribution("user_1");

    expect(result.joinsByPillar).toEqual([
      { pillar: "uncategorized", joins: 3 },
    ]);
    expect(result.topConvertingPillar).toEqual({
      pillar: "uncategorized",
      joins: 3,
    });
  });
});

// ─── CRUD methods ───────────────────────────────────────────────────────────

beforeEach(() => vi.clearAllMocks());

function prow(overrides: Partial<FakeRow> = {}): FakeRow {
  return {
    id: "pr1",
    userId: "user_123",
    handle: "@bob",
    platform: "twitter",
    source: "manual",
    status: "cold",
    notes: "note",
    tags: ["lead"],
    lastContactedAt: null,
    contactedCount: 0,
    convertedFromContentId: null,
    createdAt: new Date("2026-05-01T00:00:00Z"),
    updatedAt: new Date("2026-05-01T00:00:00Z"),
    ...overrides,
  };
}

describe("DrizzleProspectRepository CRUD", () => {
  describe("listProspects", () => {
    it("returns items + total with all filters (rows select then count)", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([prow()]); // rows
      queue.select.push([{ count: 1 }]); // count
      const repo = new DrizzleProspectRepository(db);

      const result = await repo.listProspects("user_123", {
        status: "cold",
        platform: "twitter",
        source: "manual",
        page: 2,
        limit: 10,
      });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it("works without optional filters", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([]);
      queue.select.push([{ count: 0 }]);
      const repo = new DrizzleProspectRepository(db);

      const result = await repo.listProspects("user_123", {
        page: 1,
        limit: 10,
      });

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });

    it("defaults nullish columns when mapping", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([
        prow({
          tags: null,
          contactedCount: null,
          createdAt: null,
          updatedAt: null,
        }),
      ]);
      queue.select.push([{ count: 1 }]);
      const repo = new DrizzleProspectRepository(db);

      const result = await repo.listProspects("user_123", {
        page: 1,
        limit: 10,
      });

      expect(result.items[0].tags).toEqual([]);
      expect(result.items[0].contactedCount).toBe(0);
      expect(result.items[0].createdAt).toBeInstanceOf(Date);
    });
  });

  describe("getProspect", () => {
    it("returns the prospect when found", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([prow()]);
      const repo = new DrizzleProspectRepository(db);
      expect((await repo.getProspect("pr1"))?.id).toBe("pr1");
    });

    it("returns null when not found", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([]);
      const repo = new DrizzleProspectRepository(db);
      expect(await repo.getProspect("x")).toBeNull();
    });
  });

  describe("createProspect", () => {
    it("inserts and returns the mapped row", async () => {
      const { db, queue, captured } = makeFakeDb();
      queue.insert.push([prow()]);
      const repo = new DrizzleProspectRepository(db);

      const result = await repo.createProspect({
        userId: "user_123",
        handle: "@bob",
        platform: "twitter",
        source: "manual",
        notes: "n",
        tags: ["lead"],
        convertedFromContentId: "cc1",
      });

      expect(result?.id).toBe("pr1");
      expect(captured.insertValues).toMatchObject({ handle: "@bob" });
    });

    it("returns null on unique-violation", async () => {
      const { db, insertError } = makeFakeDb();
      insertError.value = { code: "23505" };
      const repo = new DrizzleProspectRepository(db);

      expect(
        await repo.createProspect({
          userId: "user_123",
          handle: "@bob",
          platform: "twitter",
        })
      ).toBeNull();
    });

    it("rethrows other errors", async () => {
      const { db, insertError } = makeFakeDb();
      insertError.value = { code: "OTHER" };
      const repo = new DrizzleProspectRepository(db);

      await expect(
        repo.createProspect({ userId: "u", handle: "@b", platform: "twitter" })
      ).rejects.toEqual({ code: "OTHER" });
    });

    it("rethrows non-object errors", async () => {
      const { db, insertError } = makeFakeDb();
      insertError.value = "boom";
      const repo = new DrizzleProspectRepository(db);

      await expect(
        repo.createProspect({ userId: "u", handle: "@b", platform: "twitter" })
      ).rejects.toBe("boom");
    });
  });

  describe("bulkCreateProspects", () => {
    it("returns empty result for empty input", async () => {
      const { db } = makeFakeDb();
      const repo = new DrizzleProspectRepository(db);

      expect(await repo.bulkCreateProspects([])).toEqual({
        inserted: [],
        skipped: 0,
      });
    });

    it("returns inserted rows and computes skipped count", async () => {
      const { db, queue } = makeFakeDb();
      queue.insert.push([prow({ id: "a" })]); // only 1 of 2 inserted
      const repo = new DrizzleProspectRepository(db);

      const result = await repo.bulkCreateProspects([
        { userId: "u", handle: "@a", platform: "twitter" },
        { userId: "u", handle: "@b", platform: "twitter" },
      ]);

      expect(result.inserted).toHaveLength(1);
      expect(result.skipped).toBe(1);
    });
  });

  describe("updateProspect", () => {
    it("updates supplied fields and returns mapped row", async () => {
      const { db, queue, captured } = makeFakeDb();
      queue.update.push([prow({ status: "responded" })]);
      const repo = new DrizzleProspectRepository(db);

      const result = await repo.updateProspect("pr1", {
        status: "responded",
        notes: "x",
        tags: ["a"],
        handle: "@new",
        convertedFromContentId: "cc1",
      });

      expect(result?.status).toBe("responded");
      const set = captured.updateSet as FakeRow;
      expect(set).toMatchObject({ status: "responded", handle: "@new" });
      expect(set).toHaveProperty("updatedAt");
    });

    it("sets contacted bookkeeping when status becomes contacted", async () => {
      const { db, queue, captured } = makeFakeDb();
      queue.update.push([prow({ status: "contacted" })]);
      const repo = new DrizzleProspectRepository(db);

      await repo.updateProspect("pr1", { status: "contacted" });

      const set = captured.updateSet as FakeRow;
      expect(set).toHaveProperty("lastContactedAt");
      expect(set).toHaveProperty("contactedCount");
    });

    it("returns null when no row was updated", async () => {
      const { db, queue } = makeFakeDb();
      queue.update.push([]);
      const repo = new DrizzleProspectRepository(db);

      expect(await repo.updateProspect("x", { status: "cold" })).toBeNull();
    });

    it("falls back to getProspect when patch is empty", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([prow()]);
      const repo = new DrizzleProspectRepository(db);

      const result = await repo.updateProspect("pr1", {});
      expect(result?.id).toBe("pr1");
    });
  });

  describe("deleteProspect", () => {
    it("issues a delete", async () => {
      const { db, captured } = makeFakeDb();
      const repo = new DrizzleProspectRepository(db);
      await repo.deleteProspect("pr1");
      expect(captured.deleteCalled).toBe(true);
    });
  });
});
