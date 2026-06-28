import { describe, it, expect, beforeEach, vi } from "vitest";
import { DrizzlePlatformMemberRepository } from "../drizzle-platform-member";
import { makeFakeDb, type FakeRow } from "./fake-db";

beforeEach(() => vi.clearAllMocks());

function row(overrides: Partial<FakeRow> = {}): FakeRow {
  return {
    id: "m1",
    userId: "user_123",
    platform: "twitter",
    platformUserId: "tw_1",
    username: "alice",
    displayName: "Alice",
    firstSeenAt: new Date("2026-05-01T00:00:00Z"),
    engagementCount: 3,
    lastSeenAt: new Date("2026-05-10T00:00:00Z"),
    status: "active",
    tags: ["vip"],
    notes: "note",
    lastInactiveFiredAt: null,
    ...overrides,
  };
}

describe("DrizzlePlatformMemberRepository", () => {
  describe("upsertPlatformMember", () => {
    it("inserts with engagementCount 1 and returns mapped row", async () => {
      const { db, queue, captured } = makeFakeDb();
      queue.insert.push([row()]);
      const repo = new DrizzlePlatformMemberRepository(db);

      const result = await repo.upsertPlatformMember({
        userId: "user_123",
        platform: "twitter",
        platformUserId: "tw_1",
        username: "alice",
        displayName: "Alice",
      });

      expect(result.id).toBe("m1");
      expect(result.engagementCount).toBe(3);
      expect(captured.insertValues).toMatchObject({
        userId: "user_123",
        engagementCount: 1,
      });
      expect(captured.onConflictDoUpdate).toBeDefined();
    });

    it("defaults firstSeenAt/lastSeenAt/engagementCount/tags when null", async () => {
      const { db, queue } = makeFakeDb();
      queue.insert.push([
        row({
          firstSeenAt: null,
          lastSeenAt: null,
          engagementCount: null,
          tags: null,
        }),
      ]);
      const repo = new DrizzlePlatformMemberRepository(db);

      const result = await repo.upsertPlatformMember({
        userId: "user_123",
        platform: "twitter",
        platformUserId: "tw_1",
        username: "alice",
      });

      expect(result.firstSeenAt).toBeInstanceOf(Date);
      expect(result.lastSeenAt).toBeInstanceOf(Date);
      expect(result.engagementCount).toBe(0);
      expect(result.tags).toEqual([]);
    });
  });

  describe("createMember", () => {
    it("inserts and returns the created row", async () => {
      const { db, queue, captured } = makeFakeDb();
      queue.insert.push([row()]);
      const repo = new DrizzlePlatformMemberRepository(db);

      const result = await repo.createMember({
        userId: "user_123",
        platform: "twitter",
        platformUserId: "tw_1",
        username: "alice",
        displayName: "Alice",
      });

      expect(result?.id).toBe("m1");
      expect(captured.insertValues).toMatchObject({ username: "alice" });
    });

    it("returns null on unique-violation error", async () => {
      const { db, insertError } = makeFakeDb();
      insertError.value = { code: "23505" };
      const repo = new DrizzlePlatformMemberRepository(db);

      const result = await repo.createMember({
        userId: "user_123",
        platform: "twitter",
        platformUserId: "tw_1",
        username: "alice",
      });

      expect(result).toBeNull();
    });

    it("rethrows non-unique-violation errors", async () => {
      const { db, insertError } = makeFakeDb();
      insertError.value = { code: "OTHER" };
      const repo = new DrizzlePlatformMemberRepository(db);

      await expect(
        repo.createMember({
          userId: "user_123",
          platform: "twitter",
          platformUserId: "tw_1",
          username: "alice",
        })
      ).rejects.toEqual({ code: "OTHER" });
    });

    it("rethrows non-object errors", async () => {
      const { db, insertError } = makeFakeDb();
      insertError.value = "boom";
      const repo = new DrizzlePlatformMemberRepository(db);

      await expect(
        repo.createMember({
          userId: "user_123",
          platform: "twitter",
          platformUserId: "tw_1",
          username: "alice",
        })
      ).rejects.toBe("boom");
    });
  });

  describe("getMembersByUserId", () => {
    it("maps all rows", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([row(), row({ id: "m2" })]);
      const repo = new DrizzlePlatformMemberRepository(db);

      const rows = await repo.getMembersByUserId("user_123");

      expect(rows).toHaveLength(2);
      expect(rows[1].id).toBe("m2");
    });
  });

  describe("listMembers", () => {
    it("returns items and total with all filters applied", async () => {
      const { db, queue } = makeFakeDb();
      // First select = rows, second select = count.
      queue.select.push([row()]);
      queue.select.push([{ count: 1 }]);
      const repo = new DrizzlePlatformMemberRepository(db);

      const result = await repo.listMembers("user_123", {
        status: "active",
        platform: "twitter",
        minEngagement: 2,
        page: 2,
        limit: 10,
      });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it("works with no optional filters", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([]);
      queue.select.push([{ count: 0 }]);
      const repo = new DrizzlePlatformMemberRepository(db);

      const result = await repo.listMembers("user_123", { page: 1, limit: 10 });

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe("getMember", () => {
    it("returns the member when found", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([row()]);
      const repo = new DrizzlePlatformMemberRepository(db);

      expect((await repo.getMember("m1"))?.id).toBe("m1");
    });

    it("returns null when not found", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([]);
      const repo = new DrizzlePlatformMemberRepository(db);

      expect(await repo.getMember("missing")).toBeNull();
    });
  });

  describe("updateMember", () => {
    it("updates supplied fields and returns mapped row", async () => {
      const { db, queue, captured } = makeFakeDb();
      queue.update.push([row({ status: "vip", notes: "x" })]);
      const repo = new DrizzlePlatformMemberRepository(db);

      const updated = await repo.updateMember("m1", {
        status: "vip",
        tags: ["a"],
        notes: "x",
        displayName: "New",
      });

      expect(updated?.status).toBe("vip");
      const set = captured.updateSet as Record<string, unknown>;
      expect(set).toMatchObject({
        status: "vip",
        tags: ["a"],
        notes: "x",
        displayName: "New",
      });
    });

    it("returns null when update matched no row", async () => {
      const { db, queue } = makeFakeDb();
      queue.update.push([]);
      const repo = new DrizzlePlatformMemberRepository(db);

      expect(await repo.updateMember("m1", { status: "vip" })).toBeNull();
    });

    it("falls back to getMember when patch is empty", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([row()]);
      const repo = new DrizzlePlatformMemberRepository(db);

      const result = await repo.updateMember("m1", {});

      expect(result?.id).toBe("m1");
    });
  });

  describe("deleteMember", () => {
    it("issues a delete", async () => {
      const { db, captured } = makeFakeDb();
      const repo = new DrizzlePlatformMemberRepository(db);

      await repo.deleteMember("m1");

      expect(captured.deleteCalled).toBe(true);
    });
  });

  describe("findInactiveMembers", () => {
    it("maps the returned rows", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([row(), row({ id: "m2" })]);
      const repo = new DrizzlePlatformMemberRepository(db);

      const rows = await repo.findInactiveMembers(new Date("2026-06-01"));

      expect(rows.map((r) => r.id)).toEqual(["m1", "m2"]);
    });
  });

  describe("markInactiveFired", () => {
    it("sets lastInactiveFiredAt", async () => {
      const { db, queue, captured } = makeFakeDb();
      queue.update.push([]);
      const repo = new DrizzlePlatformMemberRepository(db);

      const firedAt = new Date("2026-06-10");
      await repo.markInactiveFired("m1", firedAt);

      expect(captured.updateSet).toMatchObject({
        lastInactiveFiredAt: firedAt,
      });
    });
  });
});
