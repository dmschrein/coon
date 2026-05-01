/**
 * Drizzle Platform Member Repository - Data access for community members.
 */

import { eq, and, gte, sql, desc, type SQL } from "drizzle-orm";
import { platformMembers } from "@/lib/db/schema";
import type { PlatformMemberRepository, PlatformMemberRow } from "./interfaces";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DrizzleDb = any;

const UNIQUE_VIOLATION = "23505";

export class DrizzlePlatformMemberRepository implements PlatformMemberRepository {
  constructor(private db: DrizzleDb) {}

  private toRow(row: typeof platformMembers.$inferSelect): PlatformMemberRow {
    return {
      id: row.id,
      userId: row.userId,
      platform: row.platform,
      platformUserId: row.platformUserId,
      username: row.username,
      displayName: row.displayName,
      firstSeenAt: row.firstSeenAt ?? new Date(),
      engagementCount: row.engagementCount ?? 0,
      lastSeenAt: row.lastSeenAt ?? new Date(),
      status: row.status,
      tags: row.tags ?? [],
      notes: row.notes,
    };
  }

  async upsertPlatformMember(params: {
    userId: string;
    platform: string;
    platformUserId: string;
    username: string;
    displayName?: string;
  }): Promise<PlatformMemberRow> {
    const now = new Date();
    const [row] = await this.db
      .insert(platformMembers)
      .values({
        userId: params.userId,
        platform: params.platform,
        platformUserId: params.platformUserId,
        username: params.username,
        displayName: params.displayName,
        engagementCount: 1,
        lastSeenAt: now,
      })
      .onConflictDoUpdate({
        target: [
          platformMembers.userId,
          platformMembers.platform,
          platformMembers.platformUserId,
        ],
        set: {
          username: params.username,
          displayName: sql`COALESCE(${params.displayName ?? null}, ${platformMembers.displayName})`,
          engagementCount: sql`${platformMembers.engagementCount} + 1`,
          lastSeenAt: now,
        },
      })
      .returning();

    return this.toRow(row);
  }

  async createMember(params: {
    userId: string;
    platform: string;
    platformUserId: string;
    username: string;
    displayName?: string;
  }): Promise<PlatformMemberRow | null> {
    try {
      const [row] = await this.db
        .insert(platformMembers)
        .values({
          userId: params.userId,
          platform: params.platform,
          platformUserId: params.platformUserId,
          username: params.username,
          displayName: params.displayName,
        })
        .returning();
      return this.toRow(row);
    } catch (err: unknown) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code?: string }).code === UNIQUE_VIOLATION
      ) {
        return null;
      }
      throw err;
    }
  }

  async getMembersByUserId(userId: string): Promise<PlatformMemberRow[]> {
    const rows = await this.db
      .select()
      .from(platformMembers)
      .where(eq(platformMembers.userId, userId));

    return rows.map((row: typeof platformMembers.$inferSelect) =>
      this.toRow(row)
    );
  }

  async listMembers(
    userId: string,
    filters: {
      status?: string;
      platform?: string;
      minEngagement?: number;
      page: number;
      limit: number;
    }
  ): Promise<{ items: PlatformMemberRow[]; total: number }> {
    const conditions: SQL[] = [eq(platformMembers.userId, userId)];

    if (filters.status) {
      conditions.push(eq(platformMembers.status, filters.status));
    }
    if (filters.platform) {
      conditions.push(eq(platformMembers.platform, filters.platform));
    }
    if (typeof filters.minEngagement === "number") {
      conditions.push(
        gte(platformMembers.engagementCount, filters.minEngagement)
      );
    }

    const where = and(...conditions);
    const offset = (filters.page - 1) * filters.limit;

    const rows = await this.db
      .select()
      .from(platformMembers)
      .where(where)
      .orderBy(desc(platformMembers.lastSeenAt), platformMembers.id)
      .limit(filters.limit)
      .offset(offset);

    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(platformMembers)
      .where(where);

    return {
      items: rows.map((row: typeof platformMembers.$inferSelect) =>
        this.toRow(row)
      ),
      total: Number(count) ?? 0,
    };
  }

  async getMember(id: string): Promise<PlatformMemberRow | null> {
    const [row] = await this.db
      .select()
      .from(platformMembers)
      .where(eq(platformMembers.id, id))
      .limit(1);

    return row ? this.toRow(row) : null;
  }

  async updateMember(
    id: string,
    patch: {
      status?: string;
      tags?: string[];
      notes?: string | null;
      displayName?: string | null;
    }
  ): Promise<PlatformMemberRow | null> {
    const setClause: Record<string, unknown> = {};
    if (patch.status !== undefined) setClause.status = patch.status;
    if (patch.tags !== undefined) setClause.tags = patch.tags;
    if (patch.notes !== undefined) setClause.notes = patch.notes;
    if (patch.displayName !== undefined)
      setClause.displayName = patch.displayName;

    if (Object.keys(setClause).length === 0) {
      return this.getMember(id);
    }

    const [updated] = await this.db
      .update(platformMembers)
      .set(setClause)
      .where(eq(platformMembers.id, id))
      .returning();

    return updated ? this.toRow(updated) : null;
  }

  async deleteMember(id: string): Promise<void> {
    await this.db.delete(platformMembers).where(eq(platformMembers.id, id));
  }
}
