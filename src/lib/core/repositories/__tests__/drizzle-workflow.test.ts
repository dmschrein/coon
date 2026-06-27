import { describe, it, expect, beforeEach, vi } from "vitest";
import { DrizzleWorkflowRepository } from "../drizzle-workflow";
import { makeFakeDb, type FakeRow } from "./fake-db";

beforeEach(() => vi.clearAllMocks());

function row(overrides: Partial<FakeRow> = {}): FakeRow {
  return {
    id: "w1",
    userId: "user_123",
    name: "Welcome",
    eventType: "member_joined",
    conditions: { x: 1 },
    actions: [{ type: "send_dm" }],
    isActive: true,
    createdAt: new Date("2026-05-01T00:00:00Z"),
    ...overrides,
  };
}

describe("DrizzleWorkflowRepository", () => {
  describe("listActiveForUserAndEvent", () => {
    it("maps rows", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([row()]);
      const repo = new DrizzleWorkflowRepository(db);

      const rows = await repo.listActiveForUserAndEvent(
        "user_123",
        "member_joined"
      );

      expect(rows).toHaveLength(1);
      expect(rows[0].eventType).toBe("member_joined");
    });

    it("defaults conditions/actions when null", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([row({ conditions: null, actions: null })]);
      const repo = new DrizzleWorkflowRepository(db);

      const rows = await repo.listActiveForUserAndEvent("user_123", "e");

      expect(rows[0].conditions).toEqual({});
      expect(rows[0].actions).toEqual([]);
    });
  });

  describe("listForUser", () => {
    it("maps all rows", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([row(), row({ id: "w2" })]);
      const repo = new DrizzleWorkflowRepository(db);

      const rows = await repo.listForUser("user_123");
      expect(rows.map((r) => r.id)).toEqual(["w1", "w2"]);
    });
  });

  describe("findById", () => {
    it("returns row when found", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([row()]);
      const repo = new DrizzleWorkflowRepository(db);
      expect((await repo.findById("w1", "user_123"))?.id).toBe("w1");
    });

    it("returns null when not found", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([]);
      const repo = new DrizzleWorkflowRepository(db);
      expect(await repo.findById("x", "user_123")).toBeNull();
    });
  });

  describe("create", () => {
    it("inserts and returns mapped row", async () => {
      const { db, queue, captured } = makeFakeDb();
      queue.insert.push([row()]);
      const repo = new DrizzleWorkflowRepository(db);

      const result = await repo.create({
        userId: "user_123",
        name: "Welcome",
        eventType: "member_joined",
        conditions: { x: 1 },
        actions: [{ type: "send_dm" }] as never,
        isActive: true,
      });

      expect(result.id).toBe("w1");
      expect(captured.insertValues).toMatchObject({ name: "Welcome" });
    });
  });

  describe("update", () => {
    it("updates supplied fields and returns mapped row", async () => {
      const { db, queue, captured } = makeFakeDb();
      queue.update.push([row({ name: "New", isActive: false })]);
      const repo = new DrizzleWorkflowRepository(db);

      const result = await repo.update("w1", "user_123", {
        name: "New",
        eventType: "member_left",
        conditions: { y: 2 },
        actions: [] as never,
        isActive: false,
      });

      expect(result?.name).toBe("New");
      expect(captured.updateSet).toMatchObject({
        name: "New",
        eventType: "member_left",
        isActive: false,
      });
    });

    it("returns null when no row updated", async () => {
      const { db, queue } = makeFakeDb();
      queue.update.push([]);
      const repo = new DrizzleWorkflowRepository(db);
      expect(await repo.update("x", "user_123", { name: "n" })).toBeNull();
    });

    it("falls back to findById when patch is empty", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([row()]);
      const repo = new DrizzleWorkflowRepository(db);

      const result = await repo.update("w1", "user_123", {});
      expect(result?.id).toBe("w1");
    });
  });

  describe("delete", () => {
    it("issues a delete", async () => {
      const { db, captured } = makeFakeDb();
      const repo = new DrizzleWorkflowRepository(db);
      await repo.delete("w1", "user_123");
      expect(captured.deleteCalled).toBe(true);
    });
  });
});
