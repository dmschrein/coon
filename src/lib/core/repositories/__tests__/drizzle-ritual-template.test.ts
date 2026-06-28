import { describe, it, expect, beforeEach, vi } from "vitest";
import { DrizzleRitualTemplateRepository } from "../drizzle-ritual-template";
import { makeFakeDb, type FakeRow } from "./fake-db";

beforeEach(() => vi.clearAllMocks());

function row(overrides: Partial<FakeRow> = {}): FakeRow {
  return {
    id: "rt1",
    userId: "user_123",
    name: "Weekly AMA",
    description: "desc",
    platform: "twitter",
    promptTemplate: "Ask me anything",
    recurrence: "weekly",
    dayOfWeek: 1,
    isActive: true,
    sourceTemplateId: null,
    createdAt: new Date("2026-05-01T00:00:00Z"),
    ...overrides,
  };
}

describe("DrizzleRitualTemplateRepository", () => {
  describe("listForUser", () => {
    it("maps the returned templates", async () => {
      const { db, queue } = makeFakeDb();
      // First select() builds the clonedSourceIds subquery (not awaited);
      // second select() is the awaited main query.
      queue.select.push([]);
      queue.select.push([row(), row({ id: "rt2" })]);
      const repo = new DrizzleRitualTemplateRepository(db);

      const rows = await repo.listForUser("user_123");

      expect(rows.map((r) => r.id)).toEqual(["rt1", "rt2"]);
      expect(rows[0].recurrence).toBe("weekly");
    });
  });

  describe("findById", () => {
    it("returns the template when found", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([row()]);
      const repo = new DrizzleRitualTemplateRepository(db);
      expect((await repo.findById("rt1"))?.id).toBe("rt1");
    });

    it("returns null when not found", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([]);
      const repo = new DrizzleRitualTemplateRepository(db);
      expect(await repo.findById("x")).toBeNull();
    });
  });

  describe("cloneForUser", () => {
    it("copies the source template fields for the user", async () => {
      const { db, queue, captured } = makeFakeDb();
      queue.select.push([row({ name: "Source", platform: "instagram" })]); // findById
      queue.insert.push([
        row({ id: "clone1", userId: "user_456", sourceTemplateId: "rt1" }),
      ]);
      const repo = new DrizzleRitualTemplateRepository(db);

      const result = await repo.cloneForUser("rt1", "user_456");

      expect(result.id).toBe("clone1");
      expect(captured.insertValues).toMatchObject({
        userId: "user_456",
        name: "Source",
        platform: "instagram",
        sourceTemplateId: "rt1",
        isActive: true,
      });
    });

    it("throws when the source template does not exist", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([]); // findById returns null
      const repo = new DrizzleRitualTemplateRepository(db);

      await expect(repo.cloneForUser("missing", "user_456")).rejects.toThrow(
        "Ritual template missing not found"
      );
    });
  });

  describe("setActive", () => {
    it("updates isActive", async () => {
      const { db, queue, captured } = makeFakeDb();
      queue.update.push([]);
      const repo = new DrizzleRitualTemplateRepository(db);

      await repo.setActive("rt1", "user_123", false);

      expect(captured.updateSet).toMatchObject({ isActive: false });
    });
  });
});
