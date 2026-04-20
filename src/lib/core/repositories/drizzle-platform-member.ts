/**
 * Drizzle Platform Member Repository - Data access for community members.
 */

import { eq, and } from "drizzle-orm";
import { platformMembers } from "@/lib/db/schema";
import type { PlatformMemberRepository, PlatformMemberRow } from "./interfaces";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DrizzleDb = any;

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
    };
  }

  async upsertPlatformMember(params: {
    userId: string;
    platform: string;
    platformUserId: string;
    username: string;
    displayName?: string;
  }): Promise<PlatformMemberRow> {
    // Check for existing member by unique constraint fields
    const [existing] = await this.db
      .select()
      .from(platformMembers)
      .where(
        and(
          eq(platformMembers.userId, params.userId),
          eq(platformMembers.platform, params.platform),
          eq(platformMembers.platformUserId, params.platformUserId)
        )
      )
      .limit(1);

    if (existing) {
      const [updated] = await this.db
        .update(platformMembers)
        .set({
          username: params.username,
          displayName: params.displayName ?? existing.displayName,
          engagementCount: (existing.engagementCount ?? 0) + 1,
          lastSeenAt: new Date(),
        })
        .where(eq(platformMembers.id, existing.id))
        .returning();

      return this.toRow(updated);
    }

    const [created] = await this.db
      .insert(platformMembers)
      .values({
        userId: params.userId,
        platform: params.platform,
        platformUserId: params.platformUserId,
        username: params.username,
        displayName: params.displayName,
      })
      .returning();

    return this.toRow(created);
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
}
