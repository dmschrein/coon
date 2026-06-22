/**
 * Drizzle Monetization Config Repository - one config per user, stored on users.monetization_config.
 */

import { eq } from "drizzle-orm";
import { users } from "@/lib/db/schema";
import type { MonetizationConfig } from "@/types";
import type { MonetizationConfigRepository } from "./interfaces";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DrizzleDb = any;

export class DrizzleMonetizationConfigRepository implements MonetizationConfigRepository {
  constructor(private db: DrizzleDb) {}

  async getConfig(userId: string): Promise<MonetizationConfig | null> {
    const [row] = await this.db
      .select({ monetizationConfig: users.monetizationConfig })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!row || !row.monetizationConfig) {
      return null;
    }

    return row.monetizationConfig as MonetizationConfig;
  }

  async upsertConfig(
    userId: string,
    config: MonetizationConfig
  ): Promise<MonetizationConfig> {
    await this.db
      .update(users)
      .set({ monetizationConfig: config, updatedAt: new Date() })
      .where(eq(users.id, userId));

    return config;
  }
}
