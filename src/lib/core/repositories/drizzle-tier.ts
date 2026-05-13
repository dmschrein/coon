/**
 * Drizzle Tier Repository - Data access for paid membership tiers.
 */

import { eq, and, asc } from "drizzle-orm";
import { membershipTier } from "@/lib/db/schema";
import type { TierCreate, TierUpdate } from "@/lib/validations/tier";
import type { TierRepository, TierRow } from "./interfaces";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DrizzleDb = any;

export class DrizzleTierRepository implements TierRepository {
  constructor(private db: DrizzleDb) {}

  private toRow(row: typeof membershipTier.$inferSelect): TierRow {
    return {
      id: row.id,
      userId: row.userId,
      name: row.name,
      tagline: row.tagline,
      description: row.description,
      priceCents: row.priceCents,
      billingCycle: row.billingCycle,
      benefits: row.benefits ?? [],
      externalPaymentUrl: row.externalPaymentUrl,
      memberCount: row.memberCount,
      isActive: row.isActive,
      sortOrder: row.sortOrder,
      createdAt: row.createdAt ?? new Date(),
    };
  }

  async listTiers(userId: string): Promise<TierRow[]> {
    const rows = await this.db
      .select()
      .from(membershipTier)
      .where(eq(membershipTier.userId, userId))
      .orderBy(asc(membershipTier.sortOrder), asc(membershipTier.createdAt));

    return rows.map((row: typeof membershipTier.$inferSelect) =>
      this.toRow(row)
    );
  }

  async getTier(id: string): Promise<TierRow | null> {
    const [row] = await this.db
      .select()
      .from(membershipTier)
      .where(eq(membershipTier.id, id))
      .limit(1);

    return row ? this.toRow(row) : null;
  }

  async createTier(userId: string, data: TierCreate): Promise<TierRow> {
    const [row] = await this.db
      .insert(membershipTier)
      .values({
        userId,
        name: data.name,
        tagline: data.tagline,
        description: data.description,
        priceCents: data.priceCents ?? 0,
        billingCycle: data.billingCycle ?? "monthly",
        benefits: data.benefits ?? [],
        externalPaymentUrl: data.externalPaymentUrl,
      })
      .returning();

    return this.toRow(row);
  }

  async updateTier(id: string, patch: TierUpdate): Promise<TierRow | null> {
    const setClause: Record<string, unknown> = {};
    if (patch.name !== undefined) setClause.name = patch.name;
    if (patch.tagline !== undefined) setClause.tagline = patch.tagline;
    if (patch.description !== undefined)
      setClause.description = patch.description;
    if (patch.priceCents !== undefined) setClause.priceCents = patch.priceCents;
    if (patch.billingCycle !== undefined)
      setClause.billingCycle = patch.billingCycle;
    if (patch.benefits !== undefined) setClause.benefits = patch.benefits;
    if (patch.externalPaymentUrl !== undefined)
      setClause.externalPaymentUrl = patch.externalPaymentUrl;
    if (patch.memberCount !== undefined)
      setClause.memberCount = patch.memberCount;
    if (patch.isActive !== undefined) setClause.isActive = patch.isActive;

    if (Object.keys(setClause).length === 0) {
      return this.getTier(id);
    }

    const [updated] = await this.db
      .update(membershipTier)
      .set(setClause)
      .where(eq(membershipTier.id, id))
      .returning();

    return updated ? this.toRow(updated) : null;
  }

  async deleteTier(id: string): Promise<void> {
    await this.db.delete(membershipTier).where(eq(membershipTier.id, id));
  }

  async reorderTiers(userId: string, orderedIds: string[]): Promise<void> {
    for (let i = 0; i < orderedIds.length; i++) {
      await this.db
        .update(membershipTier)
        .set({ sortOrder: i })
        .where(
          and(
            eq(membershipTier.id, orderedIds[i]),
            eq(membershipTier.userId, userId)
          )
        );
    }
  }
}
