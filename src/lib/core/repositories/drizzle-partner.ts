/**
 * Drizzle Partner Repository - Data access for cross-community partners.
 */

import { eq, desc } from "drizzle-orm";
import { partners } from "@/lib/db/schema";
import type { PartnerCreate, PartnerUpdate } from "@/lib/validations/partner";
import type { PartnerRepository, PartnerRow } from "./interfaces";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DrizzleDb = any;

export class DrizzlePartnerRepository implements PartnerRepository {
  constructor(private db: DrizzleDb) {}

  private toRow(row: typeof partners.$inferSelect): PartnerRow {
    return {
      id: row.id,
      userId: row.userId,
      name: row.name,
      platform: row.platform,
      url: row.url,
      contactHandle: row.contactHandle,
      status: row.status,
      collaborationIdeas: row.collaborationIdeas,
      notes: row.notes,
      createdAt: row.createdAt ?? new Date(),
      updatedAt: row.updatedAt ?? new Date(),
    };
  }

  async listPartners(userId: string): Promise<PartnerRow[]> {
    const rows = await this.db
      .select()
      .from(partners)
      .where(eq(partners.userId, userId))
      .orderBy(desc(partners.createdAt), partners.id);

    return rows.map((row: typeof partners.$inferSelect) => this.toRow(row));
  }

  async getPartner(id: string): Promise<PartnerRow | null> {
    const [row] = await this.db
      .select()
      .from(partners)
      .where(eq(partners.id, id))
      .limit(1);

    return row ? this.toRow(row) : null;
  }

  async createPartner(
    userId: string,
    data: PartnerCreate
  ): Promise<PartnerRow> {
    const [row] = await this.db
      .insert(partners)
      .values({
        userId,
        name: data.name,
        platform: data.platform,
        url: data.url,
        contactHandle: data.contactHandle,
        status: data.status,
        collaborationIdeas: data.collaborationIdeas,
        notes: data.notes,
      })
      .returning();

    return this.toRow(row);
  }

  async updatePartner(
    id: string,
    patch: PartnerUpdate
  ): Promise<PartnerRow | null> {
    const setClause: Record<string, unknown> = {};
    if (patch.name !== undefined) setClause.name = patch.name;
    if (patch.platform !== undefined) setClause.platform = patch.platform;
    if (patch.url !== undefined) setClause.url = patch.url;
    if (patch.contactHandle !== undefined) {
      setClause.contactHandle = patch.contactHandle;
    }
    if (patch.status !== undefined) setClause.status = patch.status;
    if (patch.collaborationIdeas !== undefined) {
      setClause.collaborationIdeas = patch.collaborationIdeas;
    }
    if (patch.notes !== undefined) setClause.notes = patch.notes;

    if (Object.keys(setClause).length === 0) {
      return this.getPartner(id);
    }

    setClause.updatedAt = new Date();

    const [updated] = await this.db
      .update(partners)
      .set(setClause)
      .where(eq(partners.id, id))
      .returning();

    return updated ? this.toRow(updated) : null;
  }

  async deletePartner(id: string): Promise<void> {
    await this.db.delete(partners).where(eq(partners.id, id));
  }
}
