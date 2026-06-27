import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { DrizzleRevenueRepository } from "../drizzle-revenue";

type FakeRow = Record<string, unknown>;
type ChainKind = "select" | "insert" | "update" | "delete";

interface FakeCaptured {
  insertValues: unknown;
  updateSet: unknown;
  deleteCalled: boolean;
}

interface FakeDbHandle {
  db: unknown;
  queue: {
    select: FakeRow[][];
    insert: FakeRow[][];
    update: FakeRow[][];
  };
  captured: FakeCaptured;
}

function makeFakeDb(): FakeDbHandle {
  const queue = {
    select: [] as FakeRow[][],
    insert: [] as FakeRow[][],
    update: [] as FakeRow[][],
  };
  const captured: FakeCaptured = {
    insertValues: undefined,
    updateSet: undefined,
    deleteCalled: false,
  };

  function chain(rows: FakeRow[] | undefined, kind: ChainKind) {
    const c: Record<string, (...args: unknown[]) => unknown> = {};
    for (const m of [
      "from",
      "where",
      "limit",
      "orderBy",
      "set",
      "values",
      "returning",
    ]) {
      c[m] = (...args: unknown[]) => {
        if (kind === "insert" && m === "values")
          captured.insertValues = args[0];
        if (kind === "update" && m === "set") captured.updateSet = args[0];
        return c;
      };
    }
    (c as unknown as PromiseLike<FakeRow[]>).then = ((
      onfulfilled?:
        | ((value: FakeRow[]) => unknown | PromiseLike<unknown>)
        | null
    ) =>
      Promise.resolve(rows ?? []).then(
        onfulfilled ?? undefined
      )) as PromiseLike<FakeRow[]>["then"];
    return c;
  }

  const db = {
    select: () => chain(queue.select.shift(), "select"),
    insert: () => chain(queue.insert.shift(), "insert"),
    update: () => chain(queue.update.shift(), "update"),
    delete: () => {
      captured.deleteCalled = true;
      return chain(undefined, "delete");
    },
  };

  return { db, queue, captured };
}

// Fix "now" so month-boundary math is deterministic.
// 2026-05-15 lies inside the "this month" window; April 2026 is "last month".
const NOW = new Date("2026-05-15T12:00:00Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

function row(overrides: Partial<FakeRow> = {}): FakeRow {
  return {
    id: "r1",
    userId: "user_123",
    date: new Date("2026-05-10T00:00:00Z"),
    source: "Patreon",
    type: "membership",
    amountCents: 1000,
    notes: null,
    createdAt: new Date("2026-05-10T12:00:00Z"),
    ...overrides,
  };
}

describe("DrizzleRevenueRepository.getMRRSummary", () => {
  it("sums entries for the current calendar month into thisMonth", async () => {
    const { db, queue } = makeFakeDb();
    queue.select.push([
      row({
        id: "a",
        date: new Date("2026-05-01T00:00:00Z"),
        amountCents: 500,
      }),
      row({
        id: "b",
        date: new Date("2026-05-20T00:00:00Z"),
        amountCents: 1500,
      }),
      row({
        id: "c",
        date: new Date("2026-04-10T00:00:00Z"),
        amountCents: 9999,
      }),
    ]);
    const repo = new DrizzleRevenueRepository(db);

    const summary = await repo.getMRRSummary("user_123");

    expect(summary.thisMonth).toBe(2000);
  });

  it("sums entries for the previous calendar month into lastMonth", async () => {
    const { db, queue } = makeFakeDb();
    queue.select.push([
      row({
        id: "a",
        date: new Date("2026-04-01T00:00:00Z"),
        amountCents: 700,
      }),
      row({
        id: "b",
        date: new Date("2026-04-30T00:00:00Z"),
        amountCents: 300,
      }),
      row({
        id: "c",
        date: new Date("2026-05-15T00:00:00Z"),
        amountCents: 9999,
      }),
      row({
        id: "d",
        date: new Date("2026-03-31T00:00:00Z"),
        amountCents: 1111,
      }),
    ]);
    const repo = new DrizzleRevenueRepository(db);

    const summary = await repo.getMRRSummary("user_123");

    expect(summary.lastMonth).toBe(1000);
  });

  it("returns { thisMonth: 0, lastMonth: 0 } when no entries exist", async () => {
    const { db, queue } = makeFakeDb();
    queue.select.push([]);
    const repo = new DrizzleRevenueRepository(db);

    const summary = await repo.getMRRSummary("user_123");

    expect(summary.thisMonth).toBe(0);
    expect(summary.lastMonth).toBe(0);
  });

  it("returns byType as a record with the correct sum per revenue type", async () => {
    const { db, queue } = makeFakeDb();
    queue.select.push([
      row({ id: "a", type: "membership", amountCents: 500 }),
      row({ id: "b", type: "membership", amountCents: 1500 }),
      row({ id: "c", type: "sponsorship", amountCents: 25000 }),
      row({ id: "d", type: "course", amountCents: 4900 }),
    ]);
    const repo = new DrizzleRevenueRepository(db);

    const summary = await repo.getMRRSummary("user_123");

    expect(summary.byType).toEqual(
      expect.objectContaining({
        membership: 2000,
        sponsorship: 25000,
        course: 4900,
      })
    );
  });

  it("returns monthlyTotals as an array of { month, total } objects", async () => {
    const { db, queue } = makeFakeDb();
    queue.select.push([
      row({
        id: "a",
        date: new Date("2026-03-15T00:00:00Z"),
        amountCents: 100,
      }),
      row({
        id: "b",
        date: new Date("2026-04-10T00:00:00Z"),
        amountCents: 200,
      }),
      row({
        id: "c",
        date: new Date("2026-04-25T00:00:00Z"),
        amountCents: 300,
      }),
      row({
        id: "d",
        date: new Date("2026-05-01T00:00:00Z"),
        amountCents: 400,
      }),
    ]);
    const repo = new DrizzleRevenueRepository(db);

    const summary = await repo.getMRRSummary("user_123");

    expect(Array.isArray(summary.monthlyTotals)).toBe(true);
    expect(summary.monthlyTotals.length).toBeGreaterThan(0);
    for (const m of summary.monthlyTotals) {
      expect(m).toHaveProperty("month");
      expect(m).toHaveProperty("total");
      expect(typeof m.month).toBe("string");
      expect(typeof m.total).toBe("number");
    }
    const aprilEntry = summary.monthlyTotals.find((m) =>
      m.month.startsWith("2026-04")
    );
    expect(aprilEntry?.total).toBe(500);
  });
});

describe("DrizzleRevenueRepository CRUD", () => {
  describe("listEntries", () => {
    it("maps rows and accepts a string date column", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([row({ date: "2026-05-10" })]);
      const repo = new DrizzleRevenueRepository(db);

      const rows = await repo.listEntries("user_123");

      expect(rows).toHaveLength(1);
      expect(rows[0].date).toBeInstanceOf(Date);
    });

    it("applies from/to date-range filters", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([row()]);
      const repo = new DrizzleRevenueRepository(db);

      const rows = await repo.listEntries("user_123", {
        from: new Date("2026-05-01"),
        to: new Date("2026-05-31"),
      });

      expect(rows).toHaveLength(1);
    });

    it("defaults createdAt when null", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([row({ createdAt: null })]);
      const repo = new DrizzleRevenueRepository(db);

      const rows = await repo.listEntries("user_123");
      expect(rows[0].createdAt).toBeInstanceOf(Date);
    });
  });

  describe("getEntry", () => {
    it("returns the entry when found", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([row()]);
      const repo = new DrizzleRevenueRepository(db);
      expect((await repo.getEntry("r1"))?.id).toBe("r1");
    });

    it("returns null when not found", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([]);
      const repo = new DrizzleRevenueRepository(db);
      expect(await repo.getEntry("x")).toBeNull();
    });
  });

  describe("createEntry", () => {
    it("serialises date to YYYY-MM-DD and returns mapped row", async () => {
      const { db, queue, captured } = makeFakeDb();
      queue.insert.push([row()]);
      const repo = new DrizzleRevenueRepository(db);

      const result = await repo.createEntry("user_123", {
        date: new Date("2026-05-10T00:00:00Z"),
        source: "Patreon",
        type: "membership",
        amountCents: 1000,
        notes: "n",
      } as never);

      expect(result.id).toBe("r1");
      expect(captured.insertValues).toMatchObject({
        userId: "user_123",
        date: "2026-05-10",
        amountCents: 1000,
      });
    });

    it("defaults source and notes to null", async () => {
      const { db, queue, captured } = makeFakeDb();
      queue.insert.push([row()]);
      const repo = new DrizzleRevenueRepository(db);

      await repo.createEntry("user_123", {
        date: new Date("2026-05-10T00:00:00Z"),
        type: "membership",
        amountCents: 500,
      } as never);

      const values = captured.insertValues as FakeRow;
      expect(values.source).toBeNull();
      expect(values.notes).toBeNull();
    });
  });

  describe("updateEntry", () => {
    it("updates supplied fields, serialising date", async () => {
      const { db, queue, captured } = makeFakeDb();
      queue.update.push([row({ amountCents: 2000 })]);
      const repo = new DrizzleRevenueRepository(db);

      const result = await repo.updateEntry("r1", {
        date: new Date("2026-06-01T00:00:00Z"),
        source: "Stripe",
        type: "course",
        amountCents: 2000,
        notes: "n",
      } as never);

      expect(result?.amountCents).toBe(2000);
      const set = captured.updateSet as FakeRow;
      expect(set.date).toBe("2026-06-01");
      expect(set.amountCents).toBe(2000);
    });

    it("returns null when no row was updated", async () => {
      const { db, queue } = makeFakeDb();
      queue.update.push([]);
      const repo = new DrizzleRevenueRepository(db);
      expect(
        await repo.updateEntry("x", { amountCents: 1 } as never)
      ).toBeNull();
    });

    it("falls back to getEntry when patch is empty", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([row()]);
      const repo = new DrizzleRevenueRepository(db);
      expect((await repo.updateEntry("r1", {} as never))?.id).toBe("r1");
    });
  });

  describe("deleteEntry", () => {
    it("issues a delete", async () => {
      const { db, captured } = makeFakeDb();
      const repo = new DrizzleRevenueRepository(db);
      await repo.deleteEntry("r1");
      expect(captured.deleteCalled).toBe(true);
    });
  });
});
