/**
 * Drizzle Blocked Sender Repository - Tracks senders blocked from a user's
 * inbox. Backed by `blocked_senders` with a unique (userId, platform, handle).
 */

import { eq, and, desc } from "drizzle-orm";
import { blockedSenders } from "@/lib/db/schema";
import type { BlockedSenderRepository, BlockedSenderRow } from "./interfaces";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DrizzleDb = any;

export class DrizzleBlockedSenderRepository implements BlockedSenderRepository {
  constructor(private db: DrizzleDb) {}

  private toRow(row: typeof blockedSenders.$inferSelect): BlockedSenderRow {
    return {
      id: row.id,
      userId: row.userId,
      platform: row.platform,
      handle: row.handle,
      blockedAt: row.blockedAt,
    };
  }

  async block(params: {
    userId: string;
    platform: string;
    handle: string;
  }): Promise<BlockedSenderRow> {
    const [row] = await this.db
      .insert(blockedSenders)
      .values({
        userId: params.userId,
        platform: params.platform,
        handle: params.handle,
      })
      .onConflictDoNothing({
        target: [
          blockedSenders.userId,
          blockedSenders.platform,
          blockedSenders.handle,
        ],
      })
      .returning();

    if (row) return this.toRow(row);

    const [existing] = await this.db
      .select()
      .from(blockedSenders)
      .where(
        and(
          eq(blockedSenders.userId, params.userId),
          eq(blockedSenders.platform, params.platform),
          eq(blockedSenders.handle, params.handle)
        )
      )
      .limit(1);

    return this.toRow(existing);
  }

  async listForUser(userId: string): Promise<BlockedSenderRow[]> {
    const rows = await this.db
      .select()
      .from(blockedSenders)
      .where(eq(blockedSenders.userId, userId))
      .orderBy(desc(blockedSenders.blockedAt));

    return rows.map((row: typeof blockedSenders.$inferSelect) =>
      this.toRow(row)
    );
  }
}
