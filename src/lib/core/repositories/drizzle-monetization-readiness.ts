/**
 * Drizzle Monetization Readiness Repository - 7-day DB cache of the readiness agent's output.
 */

import { eq } from "drizzle-orm";
import { users } from "@/lib/db/schema";
import type { ReadinessOutput } from "@/types";
import type { MonetizationReadinessRepository } from "./interfaces";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DrizzleDb = any;

export class DrizzleMonetizationReadinessRepository implements MonetizationReadinessRepository {
  constructor(private db: DrizzleDb) {}

  async getCache(
    userId: string
  ): Promise<{ cache: ReadinessOutput | null; updatedAt: Date | null }> {
    const [row] = await this.db
      .select({
        readinessCache: users.readinessCache,
        readinessUpdatedAt: users.readinessUpdatedAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!row) return { cache: null, updatedAt: null };

    return {
      cache: (row.readinessCache as ReadinessOutput | null) ?? null,
      updatedAt: row.readinessUpdatedAt ?? null,
    };
  }

  async upsertCache(userId: string, cache: ReadinessOutput): Promise<void> {
    await this.db
      .update(users)
      .set({ readinessCache: cache, readinessUpdatedAt: new Date() })
      .where(eq(users.id, userId));
  }
}
