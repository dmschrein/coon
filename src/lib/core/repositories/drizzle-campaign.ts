/**
 * Drizzle Campaign Repository - Data access for campaigns.
 */

import { eq, and, desc } from "drizzle-orm";
import { campaigns } from "@/lib/db/schema";
import { Campaign } from "../domain/campaign";
import type { CampaignRepository } from "./interfaces";
import type {
  CampaignPlatform,
  CampaignCalendar,
  CampaignStrategy,
  CampaignStatus,
  CampaignGoal,
  CampaignDuration,
  ContentPillar,
} from "@/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DrizzleDb = any;

export class DrizzleCampaignRepository implements CampaignRepository {
  constructor(private db: DrizzleDb) {}

  private toDomain(row: typeof campaigns.$inferSelect): Campaign {
    return new Campaign(
      row.id,
      row.userId,
      row.name,
      row.status as CampaignStatus,
      (row.selectedPlatforms ?? []) as CampaignPlatform[],
      (row.completedPlatforms ?? []) as CampaignPlatform[],
      (row.strategyData as CampaignStrategy) ?? null,
      (row.calendarData as CampaignCalendar) ?? null,
      row.totalTokensUsed ?? 0,
      row.audienceProfileId,
      row.quizResponseId,
      row.createdAt ?? new Date(),
      (row.goal as CampaignGoal) ?? null,
      row.topic ?? null,
      (row.duration as CampaignDuration) ?? null,
      (row.frequencyConfig as Record<string, number>) ?? null,
      row.strategySummary ?? null,
      (row.contentPillars as ContentPillar[]) ?? null
    );
  }

  async findById(id: string, userId: string): Promise<Campaign | null> {
    const [row] = await this.db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.id, id), eq(campaigns.userId, userId)))
      .limit(1);

    return row ? this.toDomain(row) : null;
  }

  async findByUserId(userId: string): Promise<Campaign[]> {
    const rows = await this.db
      .select()
      .from(campaigns)
      .where(eq(campaigns.userId, userId))
      .orderBy(desc(campaigns.createdAt));

    return rows.map((row: typeof campaigns.$inferSelect) => this.toDomain(row));
  }

  async save(campaign: Campaign): Promise<Campaign> {
    await this.db
      .update(campaigns)
      .set({
        name: campaign.name,
        status: campaign.status,
        strategyData: campaign.strategy,
        calendarData: campaign.calendar,
        completedPlatforms: campaign.completedPlatforms,
        totalTokensUsed: campaign.totalTokensUsed,
        strategySummary: campaign.strategySummary,
        contentPillars: campaign.contentPillars,
        updatedAt: new Date(),
      })
      .where(eq(campaigns.id, campaign.id));

    return campaign;
  }

  async create(params: {
    userId: string;
    selectedPlatforms: CampaignPlatform[];
    audienceProfileId: string;
    quizResponseId: string;
    name: string | null;
    status: string;
    strategyData: CampaignStrategy | null;
    totalTokensUsed: number;
    goal?: CampaignGoal;
    topic?: string;
    duration?: CampaignDuration;
    frequencyConfig?: Record<string, number>;
  }): Promise<Campaign> {
    const [row] = await this.db
      .insert(campaigns)
      .values({
        userId: params.userId,
        audienceProfileId: params.audienceProfileId,
        quizResponseId: params.quizResponseId,
        name: params.name,
        status: params.status,
        strategyData: params.strategyData,
        selectedPlatforms: params.selectedPlatforms,
        totalTokensUsed: params.totalTokensUsed,
        goal: params.goal,
        topic: params.topic,
        duration: params.duration,
        frequencyConfig: params.frequencyConfig,
      })
      .returning();

    return this.toDomain(row);
  }

  async updatePlan(
    id: string,
    strategySummary: string,
    contentPillars: ContentPillar[],
    tokensUsed: number
  ): Promise<void> {
    const [existing] = await this.db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, id))
      .limit(1);

    if (!existing) return;

    await this.db
      .update(campaigns)
      .set({
        strategySummary,
        contentPillars,
        status: "strategy_complete",
        totalTokensUsed: (existing.totalTokensUsed ?? 0) + tokensUsed,
        updatedAt: new Date(),
      })
      .where(eq(campaigns.id, id));
  }

  async updateStrategy(
    id: string,
    strategy: CampaignStrategy,
    name: string,
    tokensUsed: number
  ): Promise<void> {
    const [existing] = await this.db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, id))
      .limit(1);

    if (!existing) return;

    await this.db
      .update(campaigns)
      .set({
        strategyData: strategy,
        name,
        status: "strategy_complete",
        totalTokensUsed: (existing.totalTokensUsed ?? 0) + tokensUsed,
        updatedAt: new Date(),
      })
      .where(eq(campaigns.id, id));
  }

  async updateCalendar(
    id: string,
    calendar: CampaignCalendar,
    tokensUsed: number
  ): Promise<void> {
    const [existing] = await this.db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, id))
      .limit(1);

    if (!existing) return;

    await this.db
      .update(campaigns)
      .set({
        calendarData: calendar,
        status: "calendar_complete",
        totalTokensUsed: (existing.totalTokensUsed ?? 0) + tokensUsed,
        updatedAt: new Date(),
      })
      .where(eq(campaigns.id, id));
  }

  async updateStatus(id: string, status: string): Promise<void> {
    await this.db
      .update(campaigns)
      .set({ status, updatedAt: new Date() })
      .where(eq(campaigns.id, id));
  }

  async updateCompletedPlatforms(
    id: string,
    completedPlatforms: CampaignPlatform[],
    tokensUsed: number
  ): Promise<void> {
    const [existing] = await this.db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, id))
      .limit(1);

    if (!existing) return;

    await this.db
      .update(campaigns)
      .set({
        completedPlatforms,
        totalTokensUsed: (existing.totalTokensUsed ?? 0) + tokensUsed,
        updatedAt: new Date(),
      })
      .where(eq(campaigns.id, id));
  }
}
