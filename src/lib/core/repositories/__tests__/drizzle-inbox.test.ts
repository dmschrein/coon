import { describe, it, expect, beforeEach, vi } from "vitest";
import { DrizzleInboxRepository } from "../drizzle-inbox";
import { makeFakeDb, type FakeRow } from "./fake-db";

beforeEach(() => vi.clearAllMocks());

function row(overrides: Partial<FakeRow> = {}): FakeRow {
  return {
    id: "i1",
    userId: "user_123",
    campaignId: "camp1",
    contentId: "cc1",
    platform: "twitter",
    authorHandle: "@bob",
    authorDisplayName: "Bob",
    messageText: "hello",
    messageType: "reply",
    status: "unread",
    platformMessageId: "pm1",
    receivedAt: new Date("2026-05-01T00:00:00Z"),
    flagged: false,
    flagReason: null,
    flagCategory: null,
    createdAt: new Date("2026-05-01T00:00:00Z"),
    ...overrides,
  };
}

describe("DrizzleInboxRepository", () => {
  describe("createItem", () => {
    it("inserts with defaults and returns mapped row", async () => {
      const { db, queue, captured } = makeFakeDb();
      queue.insert.push([row()]);
      const repo = new DrizzleInboxRepository(db);

      const result = await repo.createItem({
        userId: "user_123",
        platform: "twitter",
        authorHandle: "@bob",
        messageText: "hello",
        messageType: "reply",
        platformMessageId: "pm1",
        receivedAt: new Date("2026-05-01T00:00:00Z"),
      });

      expect(result.id).toBe("i1");
      expect(captured.insertValues).toMatchObject({
        campaignId: null,
        contentId: null,
        flagged: false,
      });
    });

    it("passes through flagged + flag metadata", async () => {
      const { db, queue, captured } = makeFakeDb();
      queue.insert.push([row({ flagged: true, flagReason: "spam" })]);
      const repo = new DrizzleInboxRepository(db);

      await repo.createItem({
        userId: "user_123",
        campaignId: "camp1",
        contentId: "cc1",
        platform: "twitter",
        authorHandle: "@bob",
        authorDisplayName: "Bob",
        messageText: "hi",
        messageType: "reply",
        platformMessageId: "pm1",
        receivedAt: new Date(),
        flagged: true,
        flagReason: "spam",
        flagCategory: "abuse",
      });

      expect(captured.insertValues).toMatchObject({
        flagged: true,
        flagReason: "spam",
        flagCategory: "abuse",
      });
    });

    it("maps nullish optional columns to null", async () => {
      const { db, queue } = makeFakeDb();
      queue.insert.push([
        row({
          campaignId: null,
          contentId: null,
          authorDisplayName: null,
          flagReason: null,
          flagCategory: null,
          createdAt: null,
        }),
      ]);
      const repo = new DrizzleInboxRepository(db);

      const result = await repo.createItem({
        userId: "user_123",
        platform: "twitter",
        authorHandle: "@bob",
        messageText: "hi",
        messageType: "reply",
        platformMessageId: "pm1",
        receivedAt: new Date(),
      });

      expect(result.campaignId).toBeNull();
      expect(result.authorDisplayName).toBeNull();
      expect(result.createdAt).toBeNull();
    });
  });

  describe("listItems", () => {
    it("returns items and total with all filters (count select runs first)", async () => {
      const { db, queue } = makeFakeDb();
      // listItems selects count FIRST, then rows.
      queue.select.push([{ total: 3 }]);
      queue.select.push([row()]);
      const repo = new DrizzleInboxRepository(db);

      const result = await repo.listItems({
        userId: "user_123",
        status: "unread",
        platform: "twitter",
        campaignId: "camp1",
        flagged: true,
        page: 2,
        limit: 5,
      });

      expect(result.total).toBe(3);
      expect(result.items).toHaveLength(1);
    });

    it("works with no optional filters and flagged=false", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([{ total: 0 }]);
      queue.select.push([]);
      const repo = new DrizzleInboxRepository(db);

      const result = await repo.listItems({
        userId: "user_123",
        flagged: false,
        page: 1,
        limit: 5,
      });

      expect(result.total).toBe(0);
      expect(result.items).toEqual([]);
    });
  });

  describe("getItem", () => {
    it("returns the item when found", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([row()]);
      const repo = new DrizzleInboxRepository(db);
      expect((await repo.getItem("i1"))?.id).toBe("i1");
    });

    it("returns null when not found", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([]);
      const repo = new DrizzleInboxRepository(db);
      expect(await repo.getItem("x")).toBeNull();
    });
  });

  describe("updateStatus", () => {
    it("updates status and returns mapped row", async () => {
      const { db, queue, captured } = makeFakeDb();
      queue.update.push([row({ status: "read" })]);
      const repo = new DrizzleInboxRepository(db);

      const result = await repo.updateStatus("i1", "read");

      expect(result.status).toBe("read");
      expect(captured.updateSet).toMatchObject({ status: "read" });
    });
  });

  describe("setFlagged", () => {
    it("clears flag metadata when unflagging", async () => {
      const { db, queue, captured } = makeFakeDb();
      queue.update.push([row({ flagged: false })]);
      const repo = new DrizzleInboxRepository(db);

      await repo.setFlagged("i1", false);

      expect(captured.updateSet).toMatchObject({
        flagged: false,
        flagReason: null,
        flagCategory: null,
      });
    });

    it("does not clear metadata when flagging", async () => {
      const { db, queue, captured } = makeFakeDb();
      queue.update.push([row({ flagged: true })]);
      const repo = new DrizzleInboxRepository(db);

      await repo.setFlagged("i1", true);

      const set = captured.updateSet as FakeRow;
      expect(set.flagged).toBe(true);
      expect(set).not.toHaveProperty("flagReason");
    });
  });

  describe("markAllFromAuthorRead", () => {
    it("returns the number of rows updated", async () => {
      const { db, queue } = makeFakeDb();
      queue.update.push([{ id: "i1" }, { id: "i2" }]);
      const repo = new DrizzleInboxRepository(db);

      const count = await repo.markAllFromAuthorRead(
        "user_123",
        "twitter",
        "@bob"
      );

      expect(count).toBe(2);
    });
  });

  describe("countUnread", () => {
    it("returns the unread total", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([{ total: 7 }]);
      const repo = new DrizzleInboxRepository(db);

      expect(await repo.countUnread("user_123")).toBe(7);
    });
  });
});
