/**
 * Drizzle Prospect Repository - Data access for outreach prospects.
 */

import { eq, and, sql, desc, type SQL } from "drizzle-orm";
import { outreachProspects } from "@/lib/db/schema";
import type { ProspectRepository, ProspectRow } from "./interfaces";

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
    }
  ): Promise<ProspectRow | null> {
    const setClause: Record<string, unknown> = {};
    if (patch.status !== undefined) setClause.status = patch.status;
    if (patch.notes !== undefined) setClause.notes = patch.notes;
    if (patch.tags !== undefined) setClause.tags = patch.tags;
    if (patch.handle !== undefined) setClause.handle = patch.handle;

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
}
