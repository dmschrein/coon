/**
 * Drizzle Community Config Repository - one config per user, stored on users.community_config.
 */

import { eq } from "drizzle-orm";
import { users } from "@/lib/db/schema";
import type { CommunityConfig } from "@/types";
import type { CommunityConfigRepository } from "./interfaces";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DrizzleDb = any;

export class DrizzleCommunityConfigRepository implements CommunityConfigRepository {
  constructor(private db: DrizzleDb) {}

  async getConfig(userId: string): Promise<CommunityConfig | null> {
    const [row] = await this.db
      .select({ communityConfig: users.communityConfig })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!row || !row.communityConfig) {
      return null;
    }

    return row.communityConfig as CommunityConfig;
  }

  async upsertConfig(
    userId: string,
    patch: CommunityConfig
  ): Promise<CommunityConfig> {
    const existing = (await this.getConfig(userId)) ?? {};
    const merged: CommunityConfig = { ...existing, ...patch };

    await this.db
      .update(users)
      .set({ communityConfig: merged, updatedAt: new Date() })
      .where(eq(users.id, userId));

    return merged;
  }
}
