/**
 * Drizzle Campaign Content Repository - Data access for platform content.
 */

import { eq, inArray } from "drizzle-orm";
import { campaignContent } from "@/lib/db/schema";
import { CampaignContentEntity } from "../domain/content";
import type { CampaignContentRepository } from "./interfaces";
import type {
  CampaignPlatform,
  CampaignContentStatus,
  ContentApprovalStatus,
} from "@/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DrizzleDb = any;

export class DrizzleCampaignContentRepository implements CampaignContentRepository {
  constructor(private db: DrizzleDb) {}

  private toDomain(
    row: typeof campaignContent.$inferSelect
  ): CampaignContentEntity {
    return new CampaignContentEntity(
      row.id,
      row.campaignId,
      row.userId,
      row.platform as CampaignPlatform,
      row.status as CampaignContentStatus,
      row.contentData,
      row.tokensUsed,
      row.errorMessage,
      row.createdAt ?? new Date(),
      (row.approvalStatus as ContentApprovalStatus) ?? "pending_review",
      row.title ?? null,
      row.pillar ?? null,
      row.body ?? null,
      row.scheduledFor ?? null,
      row.mediaSuggestions ?? null
    );
  }

  async findById(id: string): Promise<CampaignContentEntity | null> {
    const [row] = await this.db
      .select()
      .from(campaignContent)
      .where(eq(campaignContent.id, id))
      .limit(1);

    return row ? this.toDomain(row) : null;
  }

  async findByCampaignId(campaignId: string): Promise<CampaignContentEntity[]> {
    const rows = await this.db
      .select()
      .from(campaignContent)
      .where(eq(campaignContent.campaignId, campaignId));

    return rows.map((row: typeof campaignContent.$inferSelect) =>
      this.toDomain(row)
    );
  }

  async createMany(
    items: {
      campaignId: string;
      userId: string;
      platform: CampaignPlatform;
      pillar?: string;
      title?: string;
      scheduledFor?: Date;
    }[]
  ): Promise<void> {
    if (items.length === 0) return;

    await this.db.insert(campaignContent).values(
      items.map((item) => ({
        campaignId: item.campaignId,
        userId: item.userId,
        platform: item.platform,
        pillar: item.pillar ?? null,
        title: item.title ?? null,
        scheduledFor: item.scheduledFor ?? null,
        status: "pending" as const,
      }))
    );
  }

  async updateStatus(
    id: string,
    status: string,
    errorMessage?: string
  ): Promise<void> {
    await this.db
      .update(campaignContent)
      .set({
        status,
        errorMessage: errorMessage ?? null,
        updatedAt: new Date(),
      })
      .where(eq(campaignContent.id, id));
  }

  async updateContent(
    id: string,
    contentData: unknown,
    tokensUsed: number
  ): Promise<void> {
    await this.db
      .update(campaignContent)
      .set({
        contentData,
        status: "complete",
        tokensUsed,
        errorMessage: null,
        updatedAt: new Date(),
      })
      .where(eq(campaignContent.id, id));
  }

  async updateApprovalStatus(
    id: string,
    approvalStatus: ContentApprovalStatus
  ): Promise<void> {
    await this.db
      .update(campaignContent)
      .set({ approvalStatus, updatedAt: new Date() })
      .where(eq(campaignContent.id, id));
  }

  async bulkUpdateApprovalStatus(
    ids: string[],
    approvalStatus: ContentApprovalStatus
  ): Promise<void> {
    if (ids.length === 0) return;

    await this.db
      .update(campaignContent)
      .set({ approvalStatus, updatedAt: new Date() })
      .where(inArray(campaignContent.id, ids));
  }

  async updateBody(id: string, body: string): Promise<void> {
    await this.db
      .update(campaignContent)
      .set({ body, updatedAt: new Date() })
      .where(eq(campaignContent.id, id));
  }

  async updateEnrichments(id: string, enrichments: unknown): Promise<void> {
    await this.db
      .update(campaignContent)
      .set({ mediaSuggestions: enrichments, updatedAt: new Date() })
      .where(eq(campaignContent.id, id));
  }

  async updateContentPiece(
    id: string,
    data: {
      body: string;
      hashtags: string[];
      mediaSuggestions: unknown;
      aiConfidenceScore: number;
      targetCommunity: string;
      contentData: unknown;
      tokensUsed: number;
    }
  ): Promise<void> {
    await this.db
      .update(campaignContent)
      .set({
        body: data.body,
        hashtags: data.hashtags,
        mediaSuggestions: data.mediaSuggestions,
        aiConfidenceScore: Math.round(data.aiConfidenceScore * 100),
        targetCommunity: data.targetCommunity,
        contentData: data.contentData,
        tokensUsed: data.tokensUsed,
        status: "complete",
        approvalStatus: "pending_review",
        errorMessage: null,
        updatedAt: new Date(),
      })
      .where(eq(campaignContent.id, id));
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(campaignContent).where(eq(campaignContent.id, id));
  }

  async updateSchedule(id: string, scheduledFor: Date): Promise<void> {
    await this.db
      .update(campaignContent)
      .set({
        scheduledFor,
        approvalStatus: "approved",
        updatedAt: new Date(),
      })
      .where(eq(campaignContent.id, id));
  }

  async bulkUpdateSchedule(ids: string[], scheduledFor: Date): Promise<void> {
    if (ids.length === 0) return;

    await this.db
      .update(campaignContent)
      .set({
        scheduledFor,
        approvalStatus: "approved",
        updatedAt: new Date(),
      })
      .where(inArray(campaignContent.id, ids));
  }

  async updateHashtags(id: string, hashtags: string[]): Promise<void> {
    await this.db
      .update(campaignContent)
      .set({ hashtags, updatedAt: new Date() })
      .where(eq(campaignContent.id, id));
  }

  async updateTargetCommunity(
    id: string,
    targetCommunity: string
  ): Promise<void> {
    await this.db
      .update(campaignContent)
      .set({ targetCommunity, updatedAt: new Date() })
      .where(eq(campaignContent.id, id));
  }
}
