/**
 * Drizzle Connected Account Repository - Data access for OAuth connected accounts.
 */

import { eq, and, lte, sql } from "drizzle-orm";
import { connectedAccounts } from "@/lib/db/schema";
import type {
  ConnectedAccountRepository,
  ConnectedAccountWithTokens,
} from "./interfaces";
import type { ConnectedAccount, SocialPlatform } from "@/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DrizzleDb = any;

function toConnectedAccount(
  row: typeof connectedAccounts.$inferSelect
): ConnectedAccount {
  return {
    id: row.id,
    userId: row.userId,
    platform: row.platform as SocialPlatform,
    accountName: row.accountName ?? null,
    accountId: row.accountId ?? null,
    profileImageUrl: row.profileImageUrl ?? null,
    isActive: row.isActive ?? true,
    tokenExpiresAt: row.tokenExpiresAt ?? null,
    scopes: row.scopes ?? null,
    createdAt: row.createdAt ?? new Date(),
  };
}

function toConnectedAccountWithTokens(
  row: typeof connectedAccounts.$inferSelect
): ConnectedAccountWithTokens {
  return {
    ...toConnectedAccount(row),
    accessTokenEncrypted: row.accessTokenEncrypted,
    refreshTokenEncrypted: row.refreshTokenEncrypted ?? null,
  };
}

export class DrizzleConnectedAccountRepository implements ConnectedAccountRepository {
  constructor(private db: DrizzleDb) {}

  async findByUserId(userId: string): Promise<ConnectedAccount[]> {
    const rows = await this.db
      .select()
      .from(connectedAccounts)
      .where(
        and(
          eq(connectedAccounts.userId, userId),
          eq(connectedAccounts.isActive, true)
        )
      );

    return rows.map(toConnectedAccount);
  }

  async findByUserAndPlatform(
    userId: string,
    platform: SocialPlatform
  ): Promise<ConnectedAccount | null> {
    const [row] = await this.db
      .select()
      .from(connectedAccounts)
      .where(
        and(
          eq(connectedAccounts.userId, userId),
          eq(connectedAccounts.platform, platform),
          eq(connectedAccounts.isActive, true)
        )
      )
      .limit(1);

    return row ? toConnectedAccount(row) : null;
  }

  async findById(id: string): Promise<ConnectedAccount | null> {
    const [row] = await this.db
      .select()
      .from(connectedAccounts)
      .where(eq(connectedAccounts.id, id))
      .limit(1);

    return row ? toConnectedAccount(row) : null;
  }

  async findByIdWithTokens(
    id: string
  ): Promise<ConnectedAccountWithTokens | null> {
    const [row] = await this.db
      .select()
      .from(connectedAccounts)
      .where(eq(connectedAccounts.id, id))
      .limit(1);

    return row ? toConnectedAccountWithTokens(row) : null;
  }

  async findByUserAndPlatformWithTokens(
    userId: string,
    platform: SocialPlatform
  ): Promise<ConnectedAccountWithTokens | null> {
    const [row] = await this.db
      .select()
      .from(connectedAccounts)
      .where(
        and(
          eq(connectedAccounts.userId, userId),
          eq(connectedAccounts.platform, platform),
          eq(connectedAccounts.isActive, true)
        )
      )
      .limit(1);

    return row ? toConnectedAccountWithTokens(row) : null;
  }

  async findExpiringTokens(
    withinDays: number
  ): Promise<ConnectedAccountWithTokens[]> {
    const rows = await this.db
      .select()
      .from(connectedAccounts)
      .where(
        and(
          eq(connectedAccounts.isActive, true),
          lte(
            connectedAccounts.tokenExpiresAt,
            sql`NOW() + INTERVAL '${sql.raw(String(withinDays))} days'`
          )
        )
      );

    return rows.map(toConnectedAccountWithTokens);
  }

  async create(params: {
    userId: string;
    platform: SocialPlatform;
    accessTokenEncrypted: string;
    refreshTokenEncrypted?: string;
    tokenExpiresAt?: Date;
    accountName?: string;
    accountId?: string;
    profileImageUrl?: string;
    scopes?: string[];
  }): Promise<ConnectedAccount> {
    const [row] = await this.db
      .insert(connectedAccounts)
      .values({
        userId: params.userId,
        platform: params.platform,
        accessTokenEncrypted: params.accessTokenEncrypted,
        refreshTokenEncrypted: params.refreshTokenEncrypted ?? null,
        tokenExpiresAt: params.tokenExpiresAt ?? null,
        accountName: params.accountName ?? null,
        accountId: params.accountId ?? null,
        profileImageUrl: params.profileImageUrl ?? null,
        scopes: params.scopes ?? null,
        isActive: true,
      })
      .returning();

    return toConnectedAccount(row);
  }

  async updateTokens(
    id: string,
    accessTokenEncrypted: string,
    refreshTokenEncrypted?: string,
    tokenExpiresAt?: Date
  ): Promise<void> {
    await this.db
      .update(connectedAccounts)
      .set({
        accessTokenEncrypted,
        refreshTokenEncrypted: refreshTokenEncrypted ?? null,
        tokenExpiresAt: tokenExpiresAt ?? null,
        updatedAt: new Date(),
      })
      .where(eq(connectedAccounts.id, id));
  }

  async deactivate(id: string): Promise<void> {
    await this.db
      .update(connectedAccounts)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(connectedAccounts.id, id));
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(connectedAccounts).where(eq(connectedAccounts.id, id));
  }
}
