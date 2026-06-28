import { describe, it, expect, beforeEach, vi } from "vitest";
import { DrizzleConnectedAccountRepository } from "../drizzle-connected-account";
import { makeFakeDb, type FakeRow } from "./fake-db";

beforeEach(() => vi.clearAllMocks());

function row(overrides: Partial<FakeRow> = {}): FakeRow {
  return {
    id: "ca1",
    userId: "user_123",
    platform: "twitter",
    accountName: "Acme",
    accountId: "acct_1",
    profileImageUrl: "https://img",
    isActive: true,
    tokenExpiresAt: new Date("2026-07-01T00:00:00Z"),
    scopes: ["read"],
    createdAt: new Date("2026-05-01T00:00:00Z"),
    accessTokenEncrypted: "enc-access",
    refreshTokenEncrypted: "enc-refresh",
    ...overrides,
  };
}

describe("DrizzleConnectedAccountRepository", () => {
  describe("findByUserId", () => {
    it("maps active accounts", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([row(), row({ id: "ca2" })]);
      const repo = new DrizzleConnectedAccountRepository(db);

      const rows = await repo.findByUserId("user_123");

      expect(rows.map((r) => r.id)).toEqual(["ca1", "ca2"]);
      expect(rows[0]).not.toHaveProperty("accessTokenEncrypted");
    });

    it("applies defaults for nullish columns", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([
        row({
          accountName: null,
          accountId: null,
          profileImageUrl: null,
          isActive: null,
          tokenExpiresAt: null,
          scopes: null,
          createdAt: null,
        }),
      ]);
      const repo = new DrizzleConnectedAccountRepository(db);

      const rows = await repo.findByUserId("user_123");

      expect(rows[0].accountName).toBeNull();
      expect(rows[0].isActive).toBe(true);
      expect(rows[0].createdAt).toBeInstanceOf(Date);
    });
  });

  describe("findByUserAndPlatform", () => {
    it("returns the account when found", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([row()]);
      const repo = new DrizzleConnectedAccountRepository(db);
      expect(
        (await repo.findByUserAndPlatform("user_123", "twitter" as never))?.id
      ).toBe("ca1");
    });

    it("returns null when not found", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([]);
      const repo = new DrizzleConnectedAccountRepository(db);
      expect(
        await repo.findByUserAndPlatform("user_123", "twitter" as never)
      ).toBeNull();
    });
  });

  describe("findById", () => {
    it("returns the account when found", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([row()]);
      const repo = new DrizzleConnectedAccountRepository(db);
      expect((await repo.findById("ca1"))?.id).toBe("ca1");
    });

    it("returns null when not found", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([]);
      const repo = new DrizzleConnectedAccountRepository(db);
      expect(await repo.findById("x")).toBeNull();
    });
  });

  describe("findByIdWithTokens", () => {
    it("includes encrypted tokens", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([row()]);
      const repo = new DrizzleConnectedAccountRepository(db);

      const result = await repo.findByIdWithTokens("ca1");

      expect(result?.accessTokenEncrypted).toBe("enc-access");
      expect(result?.refreshTokenEncrypted).toBe("enc-refresh");
    });

    it("returns null when not found", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([]);
      const repo = new DrizzleConnectedAccountRepository(db);
      expect(await repo.findByIdWithTokens("x")).toBeNull();
    });

    it("maps null refresh token to null", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([row({ refreshTokenEncrypted: null })]);
      const repo = new DrizzleConnectedAccountRepository(db);
      expect(
        (await repo.findByIdWithTokens("ca1"))?.refreshTokenEncrypted
      ).toBeNull();
    });
  });

  describe("findByUserAndPlatformWithTokens", () => {
    it("returns tokens when found", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([row()]);
      const repo = new DrizzleConnectedAccountRepository(db);
      expect(
        (
          await repo.findByUserAndPlatformWithTokens(
            "user_123",
            "twitter" as never
          )
        )?.accessTokenEncrypted
      ).toBe("enc-access");
    });

    it("returns null when not found", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([]);
      const repo = new DrizzleConnectedAccountRepository(db);
      expect(
        await repo.findByUserAndPlatformWithTokens(
          "user_123",
          "twitter" as never
        )
      ).toBeNull();
    });
  });

  describe("findExpiringTokens", () => {
    it("maps rows with tokens", async () => {
      const { db, queue } = makeFakeDb();
      queue.select.push([row()]);
      const repo = new DrizzleConnectedAccountRepository(db);

      const rows = await repo.findExpiringTokens(7);

      expect(rows[0].accessTokenEncrypted).toBe("enc-access");
    });
  });

  describe("create", () => {
    it("inserts defaults and returns mapped account", async () => {
      const { db, queue, captured } = makeFakeDb();
      queue.insert.push([row()]);
      const repo = new DrizzleConnectedAccountRepository(db);

      const result = await repo.create({
        userId: "user_123",
        platform: "twitter" as never,
        accessTokenEncrypted: "enc-access",
      });

      expect(result.id).toBe("ca1");
      expect(captured.insertValues).toMatchObject({
        userId: "user_123",
        accessTokenEncrypted: "enc-access",
        refreshTokenEncrypted: null,
        isActive: true,
      });
    });

    it("passes through optional fields", async () => {
      const { db, queue, captured } = makeFakeDb();
      queue.insert.push([row()]);
      const repo = new DrizzleConnectedAccountRepository(db);

      await repo.create({
        userId: "user_123",
        platform: "twitter" as never,
        accessTokenEncrypted: "a",
        refreshTokenEncrypted: "r",
        tokenExpiresAt: new Date("2026-08-01"),
        accountName: "Acme",
        accountId: "acct",
        profileImageUrl: "https://img",
        scopes: ["read"],
        metadata: { k: "v" },
      });

      expect(captured.insertValues).toMatchObject({
        refreshTokenEncrypted: "r",
        accountName: "Acme",
        scopes: ["read"],
        metadata: { k: "v" },
      });
    });
  });

  describe("updateTokens", () => {
    it("updates token fields", async () => {
      const { db, queue, captured } = makeFakeDb();
      queue.update.push([]);
      const repo = new DrizzleConnectedAccountRepository(db);

      await repo.updateTokens(
        "ca1",
        "new-access",
        "new-refresh",
        new Date("2026-09-01")
      );

      expect(captured.updateSet).toMatchObject({
        accessTokenEncrypted: "new-access",
        refreshTokenEncrypted: "new-refresh",
      });
    });

    it("defaults missing refresh/expiry to null", async () => {
      const { db, queue, captured } = makeFakeDb();
      queue.update.push([]);
      const repo = new DrizzleConnectedAccountRepository(db);

      await repo.updateTokens("ca1", "new-access");

      const set = captured.updateSet as FakeRow;
      expect(set.refreshTokenEncrypted).toBeNull();
      expect(set.tokenExpiresAt).toBeNull();
    });
  });

  describe("deactivate", () => {
    it("sets isActive false", async () => {
      const { db, queue, captured } = makeFakeDb();
      queue.update.push([]);
      const repo = new DrizzleConnectedAccountRepository(db);

      await repo.deactivate("ca1");

      expect(captured.updateSet).toMatchObject({ isActive: false });
    });
  });

  describe("delete", () => {
    it("issues a delete", async () => {
      const { db, captured } = makeFakeDb();
      const repo = new DrizzleConnectedAccountRepository(db);
      await repo.delete("ca1");
      expect(captured.deleteCalled).toBe(true);
    });
  });
});
