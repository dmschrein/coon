/**
 * Drizzle Sponsor Repository - Data access for sponsorship CRM.
 */

import { eq, and, desc, inArray, sql, type SQL } from "drizzle-orm";
import { sponsors } from "@/lib/db/schema";
import type {
  SponsorCreate,
  SponsorStatus,
  SponsorUpdate,
} from "@/lib/validations/sponsor";
import type { SponsorRepository, SponsorRow } from "./interfaces";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DrizzleDb = any;

export class DrizzleSponsorRepository implements SponsorRepository {
  constructor(private db: DrizzleDb) {}

  private toRow(row: typeof sponsors.$inferSelect): SponsorRow {
    return {
      id: row.id,
      userId: row.userId,
      companyName: row.companyName,
      contactName: row.contactName,
      contactEmail: row.contactEmail,
      dealValue: row.dealValue,
      status: row.status,
      deliverables: row.deliverables,
      startDate: row.startDate,
      endDate: row.endDate,
      notes: row.notes,
      createdAt: row.createdAt ?? new Date(),
      updatedAt: row.updatedAt ?? new Date(),
    };
  }

  async listSponsors(
    userId: string,
    filters?: { status?: SponsorStatus }
  ): Promise<SponsorRow[]> {
    const conditions: SQL[] = [eq(sponsors.userId, userId)];
    if (filters?.status) {
      conditions.push(eq(sponsors.status, filters.status));
    }

    const rows = await this.db
      .select()
      .from(sponsors)
      .where(and(...conditions))
      .orderBy(desc(sponsors.createdAt), sponsors.id);

    return rows.map((row: typeof sponsors.$inferSelect) => this.toRow(row));
  }

  async getSponsor(id: string): Promise<SponsorRow | null> {
    const [row] = await this.db
      .select()
      .from(sponsors)
      .where(eq(sponsors.id, id))
      .limit(1);

    return row ? this.toRow(row) : null;
  }

  async createSponsor(
    userId: string,
    data: SponsorCreate
  ): Promise<SponsorRow> {
    const [row] = await this.db
      .insert(sponsors)
      .values({
        userId,
        companyName: data.companyName,
        contactName: data.contactName,
        contactEmail: data.contactEmail,
        dealValue: data.dealValue,
        status: data.status,
        deliverables: data.deliverables,
        startDate: data.startDate,
        endDate: data.endDate,
        notes: data.notes,
      })
      .returning();

    return this.toRow(row);
  }

  async updateSponsor(
    id: string,
    patch: SponsorUpdate
  ): Promise<SponsorRow | null> {
    const setClause: Record<string, unknown> = {};
    if (patch.companyName !== undefined)
      setClause.companyName = patch.companyName;
    if (patch.contactName !== undefined)
      setClause.contactName = patch.contactName;
    if (patch.contactEmail !== undefined)
      setClause.contactEmail = patch.contactEmail;
    if (patch.dealValue !== undefined) setClause.dealValue = patch.dealValue;
    if (patch.status !== undefined) setClause.status = patch.status;
    if (patch.deliverables !== undefined)
      setClause.deliverables = patch.deliverables;
    if (patch.startDate !== undefined) setClause.startDate = patch.startDate;
    if (patch.endDate !== undefined) setClause.endDate = patch.endDate;
    if (patch.notes !== undefined) setClause.notes = patch.notes;

    if (Object.keys(setClause).length === 0) {
      return this.getSponsor(id);
    }

    setClause.updatedAt = new Date();

    const [updated] = await this.db
      .update(sponsors)
      .set(setClause)
      .where(eq(sponsors.id, id))
      .returning();

    return updated ? this.toRow(updated) : null;
  }

  async deleteSponsor(id: string): Promise<void> {
    await this.db.delete(sponsors).where(eq(sponsors.id, id));
  }

  async getPipelineValue(userId: string): Promise<number> {
    const [row] = await this.db
      .select({
        total: sql<number>`coalesce(sum(${sponsors.dealValue}), 0)::int`,
      })
      .from(sponsors)
      .where(
        and(
          eq(sponsors.userId, userId),
          inArray(sponsors.status, ["negotiating", "active"])
        )
      );

    return Number(row?.total ?? 0);
  }
}
