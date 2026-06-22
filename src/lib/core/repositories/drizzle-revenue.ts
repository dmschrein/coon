/**
 * Drizzle Revenue Repository - Data access for the revenue tracking dashboard.
 *
 * Month-boundary math (this/last month, monthlyTotals) is computed in UTC.
 * Entries are filtered/aggregated in TS after a single per-user select so the
 * MRR summary, byType breakdown, and monthlyTotals stay consistent and easy
 * to test against fake rows.
 */

import { eq, and, desc, gte, lte, type SQL } from "drizzle-orm";
import { revenueEntry } from "@/lib/db/schema";
import type {
  RevenueCreate,
  RevenueUpdate,
  MRRSummary,
} from "@/lib/validations/revenue";
import type {
  RevenueRepository,
  RevenueEntryRow,
  RevenueDateRange,
} from "./interfaces";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DrizzleDb = any;

type DbRow = typeof revenueEntry.$inferSelect;

function toRow(row: DbRow): RevenueEntryRow {
  // Drizzle's `date` column returns a YYYY-MM-DD string by default; the test
  // fakes feed actual Date objects, so accept either.
  const raw = row.date as unknown;
  const date = raw instanceof Date ? raw : new Date(String(raw) + "T00:00:00Z");
  return {
    id: row.id,
    userId: row.userId,
    date,
    source: row.source,
    type: row.type,
    amountCents: row.amountCents,
    notes: row.notes,
    createdAt: row.createdAt ?? new Date(),
  };
}

function monthKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export class DrizzleRevenueRepository implements RevenueRepository {
  constructor(private db: DrizzleDb) {}

  async listEntries(
    userId: string,
    dateRange?: RevenueDateRange
  ): Promise<RevenueEntryRow[]> {
    const conditions: SQL[] = [eq(revenueEntry.userId, userId)];
    if (dateRange?.from) {
      conditions.push(
        gte(revenueEntry.date, dateRange.from.toISOString().slice(0, 10))
      );
    }
    if (dateRange?.to) {
      conditions.push(
        lte(revenueEntry.date, dateRange.to.toISOString().slice(0, 10))
      );
    }

    const rows = await this.db
      .select()
      .from(revenueEntry)
      .where(and(...conditions))
      .orderBy(desc(revenueEntry.date), revenueEntry.id);

    return rows.map((r: DbRow) => toRow(r));
  }

  async getEntry(id: string): Promise<RevenueEntryRow | null> {
    const [row] = await this.db
      .select()
      .from(revenueEntry)
      .where(eq(revenueEntry.id, id))
      .limit(1);
    return row ? toRow(row) : null;
  }

  async createEntry(
    userId: string,
    data: RevenueCreate
  ): Promise<RevenueEntryRow> {
    const [row] = await this.db
      .insert(revenueEntry)
      .values({
        userId,
        date: data.date.toISOString().slice(0, 10),
        source: data.source ?? null,
        type: data.type,
        amountCents: data.amountCents,
        notes: data.notes ?? null,
      })
      .returning();
    return toRow(row);
  }

  async updateEntry(
    id: string,
    patch: RevenueUpdate
  ): Promise<RevenueEntryRow | null> {
    const setClause: Record<string, unknown> = {};
    if (patch.date !== undefined)
      setClause.date = patch.date.toISOString().slice(0, 10);
    if (patch.source !== undefined) setClause.source = patch.source;
    if (patch.type !== undefined) setClause.type = patch.type;
    if (patch.amountCents !== undefined)
      setClause.amountCents = patch.amountCents;
    if (patch.notes !== undefined) setClause.notes = patch.notes;

    if (Object.keys(setClause).length === 0) {
      return this.getEntry(id);
    }

    const [updated] = await this.db
      .update(revenueEntry)
      .set(setClause)
      .where(eq(revenueEntry.id, id))
      .returning();

    return updated ? toRow(updated) : null;
  }

  async deleteEntry(id: string): Promise<void> {
    await this.db.delete(revenueEntry).where(eq(revenueEntry.id, id));
  }

  async getMRRSummary(userId: string): Promise<MRRSummary> {
    const entries = await this.listEntries(userId);

    const now = new Date();
    const thisMonthKey = monthKey(now);
    const lastMonthDate = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)
    );
    const lastMonthKey = monthKey(lastMonthDate);

    let thisMonth = 0;
    let lastMonth = 0;
    const byType: Record<string, number> = {};
    const monthlyMap = new Map<string, number>();

    for (const e of entries) {
      const key = monthKey(e.date);
      if (key === thisMonthKey) thisMonth += e.amountCents;
      if (key === lastMonthKey) lastMonth += e.amountCents;

      byType[e.type] = (byType[e.type] ?? 0) + e.amountCents;
      monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + e.amountCents);
    }

    const monthlyTotals = Array.from(monthlyMap.entries())
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([month, total]) => ({ month, total }));

    return { thisMonth, lastMonth, byType, monthlyTotals };
  }
}
