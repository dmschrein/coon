/**
 * Drizzle Audience Profile Repository - Data access for audience profiles.
 */

import { eq, and, desc } from "drizzle-orm";
import { audienceProfiles } from "@/lib/db/schema";
import { AudienceProfileEntity } from "../domain/audience-profile";
import type { AudienceProfileRepository } from "./interfaces";
import type { AudienceProfile } from "@/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DrizzleDb = any;

export class DrizzleAudienceProfileRepository implements AudienceProfileRepository {
  constructor(private db: DrizzleDb) {}

  private toDomain(
    row: typeof audienceProfiles.$inferSelect
  ): AudienceProfileEntity {
    return new AudienceProfileEntity(
      row.id,
      row.userId,
      row.quizResponseId,
      row.profileData as AudienceProfile,
      row.isActive ?? true,
      row.generatedAt ?? new Date()
    );
  }

  async findActiveByUserId(
    userId: string
  ): Promise<AudienceProfileEntity | null> {
    const [row] = await this.db
      .select()
      .from(audienceProfiles)
      .where(
        and(
          eq(audienceProfiles.userId, userId),
          eq(audienceProfiles.isActive, true)
        )
      )
      .orderBy(desc(audienceProfiles.generatedAt))
      .limit(1);

    return row ? this.toDomain(row) : null;
  }

  async findById(id: string): Promise<AudienceProfileEntity | null> {
    const [row] = await this.db
      .select()
      .from(audienceProfiles)
      .where(eq(audienceProfiles.id, id))
      .limit(1);

    return row ? this.toDomain(row) : null;
  }

  async create(params: {
    userId: string;
    quizResponseId: string;
    profileData: AudienceProfile;
  }): Promise<AudienceProfileEntity> {
    const [row] = await this.db
      .insert(audienceProfiles)
      .values({
        userId: params.userId,
        quizResponseId: params.quizResponseId,
        profileData: params.profileData,
        isActive: true,
      })
      .returning();

    return this.toDomain(row);
  }

  async deactivateAllForUser(userId: string): Promise<void> {
    await this.db
      .update(audienceProfiles)
      .set({ isActive: false })
      .where(
        and(
          eq(audienceProfiles.userId, userId),
          eq(audienceProfiles.isActive, true)
        )
      );
  }
}
