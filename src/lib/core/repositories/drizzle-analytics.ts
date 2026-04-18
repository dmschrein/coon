/**
 * Drizzle Analytics Repository - Data access for campaign and content analytics.
 */

import { eq, and, desc } from "drizzle-orm";
import { campaignAnalytics, contentAnalytics } from "@/lib/db/schema";
import type {
  AnalyticsRepository,
  CampaignAnalyticsSnapshot,
  ContentAnalyticsRow,
} from "./interfaces";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DrizzleDb = any;

export class DrizzleAnalyticsRepository implements AnalyticsRepository {
  constructor(private db: DrizzleDb) {}

  async getLatestCampaignSnapshot(
    campaignId: string,
    userId: string
  ): Promise<CampaignAnalyticsSnapshot | null> {
    const [row] = await this.db
      .select()
      .from(campaignAnalytics)
      .where(
        and(
          eq(campaignAnalytics.campaignId, campaignId),
          eq(campaignAnalytics.userId, userId)
        )
      )
      .orderBy(desc(campaignAnalytics.snapshotDate))
      .limit(1);

    if (!row) return null;

    return {
      id: row.id,
      campaignId: row.campaignId,
      totalReach: row.totalReach ?? 0,
      totalEngagements: row.totalEngagements ?? 0,
      totalImpressions: row.totalImpressions ?? 0,
      engagementRate: row.engagementRate ?? null,
      followerGrowth: row.followerGrowth ?? 0,
      platformBreakdown: row.platformBreakdown,
      pillarBreakdown: row.pillarBreakdown,
      aiInsights: row.aiInsights,
      aiRecommendations: row.aiRecommendations,
      snapshotDate: row.snapshotDate ?? new Date(),
    };
  }

  async saveCampaignSnapshot(params: {
    campaignId: string;
    userId: string;
    totalReach: number;
    totalEngagements: number;
    totalImpressions: number;
    engagementRate: string;
    followerGrowth: number;
    platformBreakdown: unknown;
    pillarBreakdown: unknown;
    aiInsights: unknown;
    aiRecommendations: unknown;
  }): Promise<CampaignAnalyticsSnapshot> {
    const [row] = await this.db
      .insert(campaignAnalytics)
      .values(params)
      .returning();

    return {
      id: row.id,
      campaignId: row.campaignId,
      totalReach: row.totalReach ?? 0,
      totalEngagements: row.totalEngagements ?? 0,
      totalImpressions: row.totalImpressions ?? 0,
      engagementRate: row.engagementRate ?? null,
      followerGrowth: row.followerGrowth ?? 0,
      platformBreakdown: row.platformBreakdown,
      pillarBreakdown: row.pillarBreakdown,
      aiInsights: row.aiInsights,
      aiRecommendations: row.aiRecommendations,
      snapshotDate: row.snapshotDate ?? new Date(),
    };
  }

  async getContentAnalytics(
    campaignId: string,
    userId: string
  ): Promise<ContentAnalyticsRow[]> {
    const rows = await this.db
      .select()
      .from(contentAnalytics)
      .where(
        and(
          eq(contentAnalytics.campaignId, campaignId),
          eq(contentAnalytics.userId, userId)
        )
      )
      .orderBy(desc(contentAnalytics.fetchedAt));

    return rows.map(
      (row: typeof contentAnalytics.$inferSelect): ContentAnalyticsRow => ({
        id: row.id,
        campaignContentId: row.campaignContentId,
        campaignId: row.campaignId,
        platform: row.platform,
        reach: row.reach ?? 0,
        impressions: row.impressions ?? 0,
        likes: row.likes ?? 0,
        comments: row.comments ?? 0,
        shares: row.shares ?? 0,
        clicks: row.clicks ?? 0,
        saves: row.saves ?? 0,
        engagementRate: row.engagementRate ?? null,
        fetchedAt: row.fetchedAt ?? new Date(),
      })
    );
  }

  async saveContentAnalytics(params: {
    campaignContentId: string;
    campaignId: string;
    userId: string;
    platform: string;
    reach: number;
    impressions: number;
    likes: number;
    comments: number;
    shares: number;
    clicks: number;
    saves: number;
    engagementRate: string;
  }): Promise<void> {
    await this.db.insert(contentAnalytics).values(params);
  }
}
