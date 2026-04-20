/**
 * Drizzle Engagement Repository - Data access for post engagement metrics.
 */

import { eq, and } from "drizzle-orm";
import { postEngagement } from "@/lib/db/schema";
import type { EngagementRepository, PostEngagementRow } from "./interfaces";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DrizzleDb = any;

export class DrizzleEngagementRepository implements EngagementRepository {
  constructor(private db: DrizzleDb) {}

  private toRow(row: typeof postEngagement.$inferSelect): PostEngagementRow {
    return {
      id: row.id,
      campaignContentId: row.campaignContentId,
      platform: row.platform,
      platformPostId: row.platformPostId,
      likes: row.likes ?? 0,
      comments: row.comments ?? 0,
      shares: row.shares ?? 0,
      reach: row.reach ?? 0,
      impressions: row.impressions ?? 0,
      engagementRate: row.engagementRate,
      recordedAt: row.recordedAt,
      createdAt: row.createdAt ?? new Date(),
    };
  }

  async upsertEngagement(params: {
    campaignContentId: string;
    platform: string;
    platformPostId: string;
    likes: number;
    comments: number;
    shares: number;
    reach: number;
    impressions: number;
    engagementRate?: string;
    recordedAt: Date;
  }): Promise<PostEngagementRow> {
    // Check for existing engagement record for this content + post combo
    const [existing] = await this.db
      .select()
      .from(postEngagement)
      .where(
        and(
          eq(postEngagement.campaignContentId, params.campaignContentId),
          eq(postEngagement.platformPostId, params.platformPostId)
        )
      )
      .limit(1);

    if (existing) {
      const [updated] = await this.db
        .update(postEngagement)
        .set({
          likes: params.likes,
          comments: params.comments,
          shares: params.shares,
          reach: params.reach,
          impressions: params.impressions,
          engagementRate: params.engagementRate,
          recordedAt: params.recordedAt,
        })
        .where(eq(postEngagement.id, existing.id))
        .returning();

      return this.toRow(updated);
    }

    const [created] = await this.db
      .insert(postEngagement)
      .values({
        campaignContentId: params.campaignContentId,
        platform: params.platform,
        platformPostId: params.platformPostId,
        likes: params.likes,
        comments: params.comments,
        shares: params.shares,
        reach: params.reach,
        impressions: params.impressions,
        engagementRate: params.engagementRate,
        recordedAt: params.recordedAt,
      })
      .returning();

    return this.toRow(created);
  }

  async getEngagementByContentId(
    campaignContentId: string
  ): Promise<PostEngagementRow[]> {
    const rows = await this.db
      .select()
      .from(postEngagement)
      .where(eq(postEngagement.campaignContentId, campaignContentId));

    return rows.map((row: typeof postEngagement.$inferSelect) =>
      this.toRow(row)
    );
  }
}
