/**
 * Drizzle Notification Repository - Data access for engagement notifications.
 */

import { eq, and, count, desc } from "drizzle-orm";
import { notifications } from "@/lib/db/schema";
import type { NotificationRepository, NotificationRow } from "./interfaces";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DrizzleDb = any;

export class DrizzleNotificationRepository implements NotificationRepository {
  constructor(private db: DrizzleDb) {}

  private toRow(row: typeof notifications.$inferSelect): NotificationRow {
    return {
      id: row.id,
      userId: row.userId,
      type: row.type,
      title: row.title,
      body: row.body,
      link: row.link ?? null,
      read: row.read,
      createdAt: row.createdAt,
    };
  }

  async createNotification(params: {
    userId: string;
    type: string;
    title: string;
    body: string;
    link?: string | null;
  }): Promise<NotificationRow> {
    const [row] = await this.db
      .insert(notifications)
      .values({
        userId: params.userId,
        type: params.type,
        title: params.title,
        body: params.body,
        link: params.link ?? null,
      })
      .returning();

    return this.toRow(row);
  }

  async listNotifications(
    userId: string,
    limit: number
  ): Promise<NotificationRow[]> {
    const rows = await this.db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);

    return rows.map((row: typeof notifications.$inferSelect) =>
      this.toRow(row)
    );
  }

  async findExistingByLink(params: {
    userId: string;
    type: string;
    link: string;
  }): Promise<NotificationRow | null> {
    const [row] = await this.db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, params.userId),
          eq(notifications.type, params.type),
          eq(notifications.link, params.link)
        )
      )
      .limit(1);

    return row ? this.toRow(row) : null;
  }

  async markAllRead(userId: string): Promise<void> {
    await this.db
      .update(notifications)
      .set({ read: true })
      .where(
        and(eq(notifications.userId, userId), eq(notifications.read, false))
      );
  }

  async countUnread(userId: string): Promise<number> {
    const [{ total }] = await this.db
      .select({ total: count() })
      .from(notifications)
      .where(
        and(eq(notifications.userId, userId), eq(notifications.read, false))
      );

    return Number(total) ?? 0;
  }
}
