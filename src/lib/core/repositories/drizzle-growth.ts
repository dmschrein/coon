/**
 * Drizzle Growth Repository — single-roundtrip aggregate query for the
 * Growth tab summary on the dashboard.
 *
 * Schema note: the spec refers to a "community_member" table — in this codebase
 * that data lives in `platform_members` (column `first_seen_at` is the join
 * date, `platform` is the platform). Conversion attribution lives on
 * `outreach_prospect.converted_from_content_id`.
 */

import { and, desc, eq, sql } from "drizzle-orm";
import {
  platformMembers,
  outreachProspects,
  campaignContent,
} from "@/lib/db/schema";
import type { GrowthRepository } from "./interfaces";
import type { GrowthSummary } from "@/lib/validations/growth";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DrizzleDb = any;

const WEEKS_WINDOW = 8;

function isoWeekLabel(date: Date): string {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function weekLabelsEnding(now: Date, count: number): string[] {
  const labels: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i * 7);
    labels.push(isoWeekLabel(d));
  }
  return labels;
}

export class DrizzleGrowthRepository implements GrowthRepository {
  constructor(private db: DrizzleDb) {}

  async getSummary(userId: string): Promise<GrowthSummary> {
    const weekExpr = sql<string>`to_char(date_trunc('week', ${platformMembers.firstSeenAt}), 'IYYY-"W"IW')`;

    const memberWeeksPromise = this.db
      .select({
        week: weekExpr,
        count: sql<number>`count(*)::int`,
      })
      .from(platformMembers)
      .where(
        and(
          eq(platformMembers.userId, userId),
          sql`${platformMembers.firstSeenAt} >= now() - interval '${sql.raw(
            String(WEEKS_WINDOW)
          )} weeks'`
        )
      )
      .groupBy(weekExpr);

    const prospectStatusPromise = this.db
      .select({
        status: outreachProspects.status,
        count: sql<number>`count(*)::int`,
      })
      .from(outreachProspects)
      .where(eq(outreachProspects.userId, userId))
      .groupBy(outreachProspects.status);

    const topContentPromise = this.db
      .select({
        title: campaignContent.title,
        joins: sql<number>`count(${outreachProspects.id})::int`,
      })
      .from(outreachProspects)
      .innerJoin(
        campaignContent,
        eq(outreachProspects.convertedFromContentId, campaignContent.id)
      )
      .where(
        and(
          eq(outreachProspects.userId, userId),
          eq(outreachProspects.status, "joined")
        )
      )
      .groupBy(campaignContent.id, campaignContent.title)
      .orderBy(desc(sql`count(${outreachProspects.id})`))
      .limit(5);

    const topPlatformPromise = this.db
      .select({
        platform: platformMembers.platform,
        count: sql<number>`count(*)::int`,
      })
      .from(platformMembers)
      .where(eq(platformMembers.userId, userId))
      .groupBy(platformMembers.platform)
      .orderBy(desc(sql`count(*)`))
      .limit(1);

    const [memberWeeks, statusRows, topContent, topPlatform] =
      await Promise.all([
        memberWeeksPromise,
        prospectStatusPromise,
        topContentPromise,
        topPlatformPromise,
      ]);

    return assembleSummary({
      memberWeeks,
      statusRows,
      topContent,
      topPlatform,
      now: new Date(),
    });
  }
}

interface AssembleInput {
  memberWeeks: Array<{ week: string | null; count: number }>;
  statusRows: Array<{ status: string; count: number }>;
  topContent: Array<{ title: string | null; joins: number }>;
  topPlatform: Array<{ platform: string; count: number }>;
  now: Date;
}

export function assembleSummary(input: AssembleInput): GrowthSummary {
  const { memberWeeks, statusRows, topContent, topPlatform, now } = input;

  const dbWeekMap = new Map<string, number>();
  for (const row of memberWeeks) {
    if (row.week) dbWeekMap.set(row.week, Number(row.count) || 0);
  }
  const labels = weekLabelsEnding(now, WEEKS_WINDOW);
  const memberCountByWeek = labels.map((week) => ({
    week,
    count: dbWeekMap.get(week) ?? 0,
  }));

  const thisWeekLabel = labels[labels.length - 1];
  const lastWeekLabel = labels[labels.length - 2];
  const newMembersThisWeek = dbWeekMap.get(thisWeekLabel) ?? 0;
  const newMembersLastWeek = lastWeekLabel
    ? (dbWeekMap.get(lastWeekLabel) ?? 0)
    : 0;

  const prospectsByStatus = {
    cold: 0,
    contacted: 0,
    responded: 0,
    joined: 0,
  };
  for (const row of statusRows) {
    if (row.status in prospectsByStatus) {
      prospectsByStatus[row.status as keyof typeof prospectsByStatus] =
        Number(row.count) || 0;
    }
  }

  const cold = prospectsByStatus.cold;
  const joined = prospectsByStatus.joined;
  const prospectConversionRate =
    cold === 0 ? 0 : Math.round((joined / cold) * 1000) / 10;

  const prospectsInPipeline =
    prospectsByStatus.cold +
    prospectsByStatus.contacted +
    prospectsByStatus.responded;

  return {
    memberCountByWeek,
    newMembersThisWeek,
    newMembersLastWeek,
    topConvertingContent: topContent.map((row) => ({
      title: row.title ?? "Untitled",
      joins: Number(row.joins) || 0,
    })),
    topConvertingPlatform: topPlatform[0]?.platform ?? "",
    prospectsInPipeline,
    prospectConversionRate,
    prospectsByStatus,
  };
}
