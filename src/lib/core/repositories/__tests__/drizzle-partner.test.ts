import { describe, it, expect } from "vitest";
import { DrizzlePartnerRepository } from "../drizzle-partner";

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

const baseDbRow: FakeRow = {
  id: "p1",
  userId: "user_123",
  name: "Indie Hackers",
  platform: "twitter",
  url: "https://twitter.com/indiehackers",
  contactHandle: "@ih",
  status: "prospect",
  collaborationIdeas: "Cross-promo",
  notes: "Met at conf",
  createdAt: new Date("2026-05-01T10:00:00Z"),
  updatedAt: new Date("2026-05-01T10:00:00Z"),
};

describe("DrizzlePartnerRepository", () => {
  describe("listPartners", () => {
    it("returns rows mapped from the database for the given userId", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([baseDbRow]);
      const repo = new DrizzlePartnerRepository(db);

      const rows = await repo.listPartners("user_123");

      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        id: "p1",
        userId: "user_123",
        name: "Indie Hackers",
        platform: "twitter",
        status: "prospect",
      });
    });

    it("returns empty array when no rows exist", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([]);
      const repo = new DrizzlePartnerRepository(db);

      const rows = await repo.listPartners("user_123");

      expect(rows).toEqual([]);
    });
  });

  describe("getPartner", () => {
    it("returns the partner when found", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([baseDbRow]);
      const repo = new DrizzlePartnerRepository(db);

      const partner = await repo.getPartner("p1");

      expect(partner).not.toBeNull();
      expect(partner?.id).toBe("p1");
    });

    it("returns null when no row matches", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([]);
      const repo = new DrizzlePartnerRepository(db);

      const partner = await repo.getPartner("missing");

      expect(partner).toBeNull();
    });
  });

  describe("createPartner", () => {
    it("inserts the supplied fields and returns the created row", async () => {
      const { db, queue, captured } = makeFakeDb();
      queue.insert.push([baseDbRow]);
      const repo = new DrizzlePartnerRepository(db);

      const created = await repo.createPartner("user_123", {
        name: "Indie Hackers",
        platform: "twitter",
        url: "https://twitter.com/indiehackers",
        contactHandle: "@ih",
        collaborationIdeas: "Cross-promo",
        notes: "Met at conf",
      });

      expect(created.id).toBe("p1");
      expect(created.name).toBe("Indie Hackers");
      expect(captured.insertValues).toMatchObject({
        userId: "user_123",
        name: "Indie Hackers",
        platform: "twitter",
      });
    });
  });

  describe("updatePartner", () => {
    it("updates only the supplied fields and returns the updated row", async () => {
      const { db, queue, captured } = makeFakeDb();
      queue.update.push([
        { ...baseDbRow, status: "active", notes: "Replied today" },
      ]);
      const repo = new DrizzlePartnerRepository(db);

      const updated = await repo.updatePartner("p1", {
        status: "active",
        notes: "Replied today",
      });

      expect(updated).not.toBeNull();
      expect(updated?.status).toBe("active");
      expect(updated?.notes).toBe("Replied today");

      const setClause = captured.updateSet as Record<string, unknown>;
      expect(setClause).toHaveProperty("status", "active");
      expect(setClause).toHaveProperty("notes", "Replied today");
      expect(setClause).toHaveProperty("updatedAt");
      expect(setClause).not.toHaveProperty("name");
      expect(setClause).not.toHaveProperty("platform");
    });

    it("returns null when no row was updated (id does not exist)", async () => {
      const { db, queue } = makeFakeDb();
      queue.update.push([]);
      const repo = new DrizzlePartnerRepository(db);

      const updated = await repo.updatePartner("missing", { status: "active" });

      expect(updated).toBeNull();
    });
  });

  describe("deletePartner", () => {
    it("issues a delete and resolves to void", async () => {
      const { db, captured } = makeFakeDb();
      const repo = new DrizzlePartnerRepository(db);

      const result = await repo.deletePartner("p1");

      expect(result).toBeUndefined();
      expect(captured.deleteCalled).toBe(true);
    });
  });
});
