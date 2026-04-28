/**
 * Drizzle Inbox Repository - Data access for engagement inbox items.
 */

import { eq, and, count, desc, type SQL } from "drizzle-orm";
import { inboxItems } from "@/lib/db/schema";
import type { InboxRepository, InboxItemRow } from "./interfaces";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DrizzleDb = any;

export class DrizzleInboxRepository implements InboxRepository {
  constructor(private db: DrizzleDb) {}

  private toRow(row: typeof inboxItems.$inferSelect): InboxItemRow {
    return {
      id: row.id,
      userId: row.userId,
      campaignId: row.campaignId ?? null,
      contentId: row.contentId ?? null,
      platform: row.platform,
      authorHandle: row.authorHandle,
      authorDisplayName: row.authorDisplayName ?? null,
      messageText: row.messageText,
      messageType: row.messageType,
      status: row.status,
      platformMessageId: row.platformMessageId,
      receivedAt: row.receivedAt,
      createdAt: row.createdAt ?? null,
    };
  }

  async createItem(params: {
    userId: string;
    campaignId?: string | null;
    contentId?: string | null;
    platform: string;
    authorHandle: string;
    authorDisplayName?: string;
    messageText: string;
    messageType: string;
    platformMessageId: string;
    receivedAt: Date;
  }): Promise<InboxItemRow> {
    const [row] = await this.db
      .insert(inboxItems)
      .values({
        userId: params.userId,
        campaignId: params.campaignId ?? null,
        contentId: params.contentId ?? null,
        platform: params.platform,
        authorHandle: params.authorHandle,
        authorDisplayName: params.authorDisplayName,
        messageText: params.messageText,
        messageType: params.messageType,
        platformMessageId: params.platformMessageId,
        receivedAt: params.receivedAt,
      })
      .returning();

    return this.toRow(row);
  }

  async listItems(params: {
    userId: string;
    status?: string;
    platform?: string;
    campaignId?: string;
    page: number;
    limit: number;
  }): Promise<{ items: InboxItemRow[]; total: number }> {
    const conditions: SQL[] = [eq(inboxItems.userId, params.userId)];

    if (params.status) {
      conditions.push(eq(inboxItems.status, params.status));
    }
    if (params.platform) {
      conditions.push(eq(inboxItems.platform, params.platform));
    }
    if (params.campaignId) {
      conditions.push(eq(inboxItems.campaignId, params.campaignId));
    }

    const where = and(...conditions);

    const [{ total }] = await this.db
      .select({ total: count() })
      .from(inboxItems)
      .where(where);

    const rows = await this.db
      .select()
      .from(inboxItems)
      .where(where)
      .orderBy(desc(inboxItems.receivedAt))
      .limit(params.limit)
      .offset((params.page - 1) * params.limit);

    return {
      items: rows.map((row: typeof inboxItems.$inferSelect) => this.toRow(row)),
      total,
    };
  }

  async getItem(id: string): Promise<InboxItemRow | null> {
    const [row] = await this.db
      .select()
      .from(inboxItems)
      .where(eq(inboxItems.id, id))
      .limit(1);

    return row ? this.toRow(row) : null;
  }

  async updateStatus(id: string, status: string): Promise<InboxItemRow> {
    const [row] = await this.db
      .update(inboxItems)
      .set({ status })
      .where(eq(inboxItems.id, id))
      .returning();

    return this.toRow(row);
  }

  async countUnread(userId: string): Promise<number> {
    const [{ total }] = await this.db
      .select({ total: count() })
      .from(inboxItems)
      .where(
        and(eq(inboxItems.userId, userId), eq(inboxItems.status, "unread"))
      );

    return total;
  }
}
