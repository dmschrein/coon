/**
 * Drizzle Calendar Entry Repository - Data access for campaign calendar entries.
 */

import { eq } from "drizzle-orm";
import { campaignCalendarEntries } from "@/lib/db/schema";
import type { CalendarEntryRepository } from "./interfaces";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DrizzleDb = any;

export class DrizzleCalendarEntryRepository implements CalendarEntryRepository {
  constructor(private db: DrizzleDb) {}

  async findByCampaignId(campaignId: string) {
    const rows = await this.db
      .select()
      .from(campaignCalendarEntries)
      .where(eq(campaignCalendarEntries.campaignId, campaignId));

    return rows.map((row: typeof campaignCalendarEntries.$inferSelect) => ({
      id: row.id,
      campaignId: row.campaignId,
      dayNumber: row.dayNumber,
      platform: row.platform,
      contentType: row.contentType,
      title: row.title,
      postingTime: row.postingTime,
      pillar: row.pillar,
      notes: row.notes,
    }));
  }

  async createMany(
    entries: {
      campaignId: string;
      userId: string;
      dayNumber: number;
      platform: string;
      contentType: string;
      title: string;
      postingTime?: string;
      pillar?: string;
      notes?: string;
    }[]
  ): Promise<void> {
    if (entries.length === 0) return;

    await this.db.insert(campaignCalendarEntries).values(
      entries.map((entry) => ({
        campaignId: entry.campaignId,
        userId: entry.userId,
        dayNumber: entry.dayNumber,
        platform: entry.platform,
        contentType: entry.contentType,
        title: entry.title,
        postingTime: entry.postingTime,
        pillar: entry.pillar,
        notes: entry.notes,
      }))
    );
  }
}
