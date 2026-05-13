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

function row(overrides: Partial<FakeRow>): FakeRow {
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
