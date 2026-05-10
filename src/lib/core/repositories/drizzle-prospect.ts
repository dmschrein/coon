/**
 * Drizzle Prospect Repository - Data access for outreach prospects.
 */

import { eq, and, sql, desc, type SQL } from "drizzle-orm";
import { outreachProspects, campaignContent } from "@/lib/db/schema";
import type {
  GrowthAttributionContentRow,
  GrowthAttributionResult,
  ProspectRepository,
  ProspectRow,
} from "./interfaces";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DrizzleDb = any;

const UNIQUE_VIOLATION = "23505";

export class DrizzleProspectRepository implements ProspectRepository {
  constructor(private db: DrizzleDb) {}

  private toRow(row: typeof outreachProspects.$inferSelect): ProspectRow {
    return {
      id: row.id,
      userId: row.userId,
      handle: row.handle,
      platform: row.platform,
      source: row.source,
      status: row.status,
      notes: row.notes,
      tags: row.tags ?? [],
      lastContactedAt: row.lastContactedAt,
      contactedCount: row.contactedCount ?? 0,
      convertedFromContentId: row.convertedFromContentId,
      createdAt: row.createdAt ?? new Date(),
      updatedAt: row.updatedAt ?? new Date(),
    };
  }

  async listProspects(
    userId: string,
    filters: {
      status?: string;
      platform?: string;
      source?: string;
      page: number;
      limit: number;
    }
  ): Promise<{ items: ProspectRow[]; total: number }> {
    const conditions: SQL[] = [eq(outreachProspects.userId, userId)];

    if (filters.status) {
      conditions.push(eq(outreachProspects.status, filters.status));
    }
    if (filters.platform) {
      conditions.push(eq(outreachProspects.platform, filters.platform));
    }
    if (filters.source) {
      conditions.push(eq(outreachProspects.source, filters.source));
    }

    const where = and(...conditions);
    const offset = (filters.page - 1) * filters.limit;

    const rows = await this.db
      .select()
      .from(outreachProspects)
      .where(where)
      .orderBy(desc(outreachProspects.createdAt), outreachProspects.id)
      .limit(filters.limit)
      .offset(offset);

    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(outreachProspects)
      .where(where);

    return {
      items: rows.map((row: typeof outreachProspects.$inferSelect) =>
        this.toRow(row)
      ),
      total: Number(count) ?? 0,
    };
  }

  async getProspect(id: string): Promise<ProspectRow | null> {
    const [row] = await this.db
      .select()
      .from(outreachProspects)
      .where(eq(outreachProspects.id, id))
      .limit(1);

    return row ? this.toRow(row) : null;
  }

  async createProspect(params: {
    userId: string;
    handle: string;
    platform: string;
    source?: string;
    notes?: string;
    tags?: string[];
    convertedFromContentId?: string;
  }): Promise<ProspectRow | null> {
    try {
      const [row] = await this.db
        .insert(outreachProspects)
        .values({
          userId: params.userId,
          handle: params.handle,
          platform: params.platform,
          source: params.source,
          notes: params.notes,
          tags: params.tags,
          convertedFromContentId: params.convertedFromContentId,
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

  async bulkCreateProspects(
    prospects: Array<{
      userId: string;
      handle: string;
      platform: string;
      source?: string;
    }>
  ): Promise<{ inserted: ProspectRow[]; skipped: number }> {
    if (prospects.length === 0) {
      return { inserted: [], skipped: 0 };
    }

    const rows = await this.db
      .insert(outreachProspects)
      .values(prospects)
      .onConflictDoNothing({
        target: [
          outreachProspects.userId,
          outreachProspects.platform,
          outreachProspects.handle,
        ],
      })
      .returning();

    const inserted = rows.map((row: typeof outreachProspects.$inferSelect) =>
      this.toRow(row)
    );
    return { inserted, skipped: prospects.length - inserted.length };
  }

  async updateProspect(
    id: string,
    patch: {
      status?: string;
      notes?: string | null;
      tags?: string[];
      handle?: string;
      convertedFromContentId?: string | null;
    }
  ): Promise<ProspectRow | null> {
    const setClause: Record<string, unknown> = {};
    if (patch.status !== undefined) setClause.status = patch.status;
    if (patch.notes !== undefined) setClause.notes = patch.notes;
    if (patch.tags !== undefined) setClause.tags = patch.tags;
    if (patch.handle !== undefined) setClause.handle = patch.handle;
    if (patch.convertedFromContentId !== undefined) {
      setClause.convertedFromContentId = patch.convertedFromContentId;
    }

    if (patch.status === "contacted") {
      setClause.lastContactedAt = new Date();
      setClause.contactedCount = sql`${outreachProspects.contactedCount} + 1`;
    }

    if (Object.keys(setClause).length === 0) {
      return this.getProspect(id);
    }

    setClause.updatedAt = new Date();

    const [updated] = await this.db
      .update(outreachProspects)
      .set(setClause)
      .where(eq(outreachProspects.id, id))
      .returning();

    return updated ? this.toRow(updated) : null;
  }

  async deleteProspect(id: string): Promise<void> {
    await this.db.delete(outreachProspects).where(eq(outreachProspects.id, id));
  }

  async getGrowthAttribution(userId: string): Promise<GrowthAttributionResult> {
    const perContent: GrowthAttributionContentRow[] = await this.db
      .select({
        contentId: campaignContent.id,
        title: campaignContent.title,
        pillar: campaignContent.pillar,
        platform: campaignContent.platform,
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
          eq(outreachProspects.status, "joined"),
          sql`${outreachProspects.convertedFromContentId} is not null`
        )
      )
      .groupBy(
        campaignContent.id,
        campaignContent.title,
        campaignContent.pillar,
        campaignContent.platform
      )
      .orderBy(desc(sql`count(${outreachProspects.id})`));

    const pillarMap = new Map<string, number>();
    const platformMap = new Map<string, number>();
    for (const row of perContent) {
      const pillarKey = row.pillar ?? "uncategorized";
      pillarMap.set(pillarKey, (pillarMap.get(pillarKey) ?? 0) + row.joins);
      platformMap.set(
        row.platform,
        (platformMap.get(row.platform) ?? 0) + row.joins
      );
    }

    const joinsByPillar = Array.from(pillarMap.entries())
      .map(([pillar, joins]) => ({ pillar, joins }))
      .sort((a, b) => b.joins - a.joins);

    const topPillar = joinsByPillar[0] ?? null;

    const sortedPlatforms = Array.from(platformMap.entries()).sort(
      (a, b) => b[1] - a[1]
    );
    const topPlatform = sortedPlatforms[0]
      ? { platform: sortedPlatforms[0][0], joins: sortedPlatforms[0][1] }
      : null;

    const totalJoins = perContent.reduce((sum, r) => sum + r.joins, 0);

    return {
      topConvertingContent: perContent.slice(0, 5),
      topConvertingPlatform: topPlatform,
      topConvertingPillar: topPillar,
      joinsByPillar,
      totalJoins,
    };
  }
}
