import { describe, it, expect, vi, beforeEach } from "vitest";
import { DrizzleTierRepository } from "../drizzle-tier";
import { GET, POST } from "@/app/api/tiers/route";

type FakeRow = Record<string, unknown>;
type ChainKind = "select" | "insert" | "update" | "delete";

interface FakeCaptured {
  insertValues: unknown;
  updateSets: unknown[];
  updateWheres: unknown[];
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
    updateSets: [],
    updateWheres: [],
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
        if (kind === "update" && m === "set") captured.updateSets.push(args[0]);
        if (kind === "update" && m === "where")
          captured.updateWheres.push(args[0]);
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

describe("DrizzleTierRepository.reorderTiers", () => {
  it("issues an update for every id in the array", async () => {
    const { db, queue, captured } = makeFakeDb();
    // Each update call returns an empty result row.
    queue.update.push([]);
    queue.update.push([]);
    queue.update.push([]);
    const repo = new DrizzleTierRepository(db);

    await repo.reorderTiers("user_123", ["t1", "t2", "t3"]);

    expect(captured.updateSets).toHaveLength(3);
  });

  it("sets sort_order 0, 1, 2 in the provided order for a full list", async () => {
    const { db, queue, captured } = makeFakeDb();
    queue.update.push([]);
    queue.update.push([]);
    queue.update.push([]);
    const repo = new DrizzleTierRepository(db);

    await repo.reorderTiers("user_123", ["t1", "t2", "t3"]);

    const sortOrders = captured.updateSets.map(
      (s) => (s as Record<string, unknown>).sortOrder
    );
    expect(sortOrders).toEqual([0, 1, 2]);
  });

  it("does not corrupt the sort_order of tiers not in the list (partial list)", async () => {
    const { db, queue, captured } = makeFakeDb();
    queue.update.push([]);
    queue.update.push([]);
    const repo = new DrizzleTierRepository(db);

    await repo.reorderTiers("user_123", ["t1", "t2"]);

    // Only two updates issued — the third tier ("t3") is untouched.
    expect(captured.updateSets).toHaveLength(2);
    const sortOrders = captured.updateSets.map(
      (s) => (s as Record<string, unknown>).sortOrder
    );
    expect(sortOrders).toEqual([0, 1]);
  });
});

// ─── API Auth Tests ─────────────────────────────────────────────────────────

const mockAuth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
}));

const mockListTiers = vi.fn();
const mockCreateTier = vi.fn();
vi.mock("@/lib/core/di/container", () => ({
  getContainer: () => ({
    tierRepo: {
      listTiers: (...args: unknown[]) => mockListTiers(...args),
      createTier: (...args: unknown[]) => mockCreateTier(...args),
    },
  }),
}));

function createPostRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/tiers", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("GET /api/tiers auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error.code).toBe("UNAUTHORIZED");
  });
});

describe("POST /api/tiers auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const response = await POST(
      createPostRequest({ name: "Premium", priceCents: 2900 })
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error.code).toBe("UNAUTHORIZED");
  });
});
