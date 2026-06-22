import { describe, it, expect } from "vitest";
import { DrizzleSponsorRepository } from "../drizzle-sponsor";

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
  id: "s1",
  userId: "user_123",
  companyName: "Acme Corp",
  contactName: "Jane Buyer",
  contactEmail: "jane@acme.test",
  dealValue: 250000,
  status: "outreach",
  deliverables: "1 sponsored post, 1 newsletter mention",
  startDate: null,
  endDate: null,
  notes: "Met at Indie meetup",
  createdAt: new Date("2026-05-01T10:00:00Z"),
  updatedAt: new Date("2026-05-01T10:00:00Z"),
};

describe("DrizzleSponsorRepository", () => {
  describe("listSponsors", () => {
    it("returns rows mapped from the database for the given userId", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([baseDbRow]);
      const repo = new DrizzleSponsorRepository(db);

      const rows = await repo.listSponsors("user_123");

      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        id: "s1",
        userId: "user_123",
        companyName: "Acme Corp",
        contactName: "Jane Buyer",
        dealValue: 250000,
        status: "outreach",
      });
    });

    it("returns empty array when no rows exist", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([]);
      const repo = new DrizzleSponsorRepository(db);

      const rows = await repo.listSponsors("user_123");

      expect(rows).toEqual([]);
    });

    it("returns only sponsors matching status filter", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([{ ...baseDbRow, status: "active" }]);
      const repo = new DrizzleSponsorRepository(db);

      const rows = await repo.listSponsors("user_123", { status: "active" });

      expect(rows).toHaveLength(1);
      expect(rows[0].status).toBe("active");
    });
  });

  describe("getSponsor", () => {
    it("returns the sponsor when found", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([baseDbRow]);
      const repo = new DrizzleSponsorRepository(db);

      const sponsor = await repo.getSponsor("s1");

      expect(sponsor).not.toBeNull();
      expect(sponsor?.id).toBe("s1");
    });

    it("returns null when no row matches", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([]);
      const repo = new DrizzleSponsorRepository(db);

      const sponsor = await repo.getSponsor("missing");

      expect(sponsor).toBeNull();
    });
  });

  describe("createSponsor", () => {
    it("inserts the supplied fields and returns the created row", async () => {
      const { db, queue, captured } = makeFakeDb();
      queue.insert.push([baseDbRow]);
      const repo = new DrizzleSponsorRepository(db);

      const created = await repo.createSponsor("user_123", {
        companyName: "Acme Corp",
        contactName: "Jane Buyer",
        contactEmail: "jane@acme.test",
        dealValue: 250000,
        deliverables: "1 sponsored post, 1 newsletter mention",
        notes: "Met at Indie meetup",
      });

      expect(created.id).toBe("s1");
      expect(created.companyName).toBe("Acme Corp");
      expect(captured.insertValues).toMatchObject({
        userId: "user_123",
        companyName: "Acme Corp",
        dealValue: 250000,
      });
    });
  });

  describe("updateSponsor", () => {
    it("updates only the supplied fields and returns the updated row", async () => {
      const { db, queue, captured } = makeFakeDb();
      queue.update.push([
        { ...baseDbRow, status: "negotiating", notes: "Sent quote" },
      ]);
      const repo = new DrizzleSponsorRepository(db);

      const updated = await repo.updateSponsor("s1", {
        status: "negotiating",
        notes: "Sent quote",
      });

      expect(updated).not.toBeNull();
      expect(updated?.status).toBe("negotiating");
      expect(updated?.notes).toBe("Sent quote");

      const setClause = captured.updateSet as Record<string, unknown>;
      expect(setClause).toHaveProperty("status", "negotiating");
      expect(setClause).toHaveProperty("notes", "Sent quote");
      expect(setClause).toHaveProperty("updatedAt");
      expect(setClause).not.toHaveProperty("companyName");
      expect(setClause).not.toHaveProperty("dealValue");
    });

    it("returns null when no row was updated (id does not exist)", async () => {
      const { db, queue } = makeFakeDb();
      queue.update.push([]);
      const repo = new DrizzleSponsorRepository(db);

      const updated = await repo.updateSponsor("missing", { status: "active" });

      expect(updated).toBeNull();
    });
  });

  describe("deleteSponsor", () => {
    it("issues a delete and resolves to void", async () => {
      const { db, captured } = makeFakeDb();
      const repo = new DrizzleSponsorRepository(db);

      const result = await repo.deleteSponsor("s1");

      expect(result).toBeUndefined();
      expect(captured.deleteCalled).toBe(true);
    });
  });

  describe("getPipelineValue", () => {
    it("returns the sum of deal_value for negotiating + active sponsors", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([{ total: 750000 }]);
      const repo = new DrizzleSponsorRepository(db);

      const value = await repo.getPipelineValue("user_123");

      expect(value).toBe(750000);
    });

    it("returns 0 (not null or undefined) when no deals exist", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([{ total: 0 }]);
      const repo = new DrizzleSponsorRepository(db);

      const value = await repo.getPipelineValue("user_123");

      expect(value).toBe(0);
    });

    it("returns 0 when the SQL result is null (no rows match)", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([{ total: null }]);
      const repo = new DrizzleSponsorRepository(db);

      const value = await repo.getPipelineValue("user_123");

      expect(value).toBe(0);
    });
  });
});
