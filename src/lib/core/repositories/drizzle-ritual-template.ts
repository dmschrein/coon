/**
 * Drizzle Ritual Template Repository - Built-in templates + per-user activations.
 */

import { and, eq, isNull, notInArray, or, sql } from "drizzle-orm";
import { ritualTemplates } from "@/lib/db/schema";
import type {
  RitualRecurrence,
  RitualTemplateRepository,
  RitualTemplateRow,
} from "./interfaces";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DrizzleDb = any;

export class DrizzleRitualTemplateRepository implements RitualTemplateRepository {
  constructor(private db: DrizzleDb) {}

  private toRow(row: typeof ritualTemplates.$inferSelect): RitualTemplateRow {
    return {
      id: row.id,
      userId: row.userId,
      name: row.name,
      description: row.description,
      platform: row.platform,
      promptTemplate: row.promptTemplate,
      recurrence: row.recurrence as RitualRecurrence,
      dayOfWeek: row.dayOfWeek,
      isActive: row.isActive,
      sourceTemplateId: row.sourceTemplateId,
      createdAt: row.createdAt,
    };
  }

  async listForUser(userId: string): Promise<RitualTemplateRow[]> {
    const clonedSourceIds = this.db
      .select({ src: ritualTemplates.sourceTemplateId })
      .from(ritualTemplates)
      .where(
        and(
          eq(ritualTemplates.userId, userId),
          sql`${ritualTemplates.sourceTemplateId} IS NOT NULL`
        )
      );

    const rows = await this.db
      .select()
      .from(ritualTemplates)
      .where(
        or(
          eq(ritualTemplates.userId, userId),
          and(
            isNull(ritualTemplates.userId),
            notInArray(ritualTemplates.id, clonedSourceIds)
          )
        )
      )
      .orderBy(ritualTemplates.name);

    return rows.map((r: typeof ritualTemplates.$inferSelect) => this.toRow(r));
  }

  async findById(id: string): Promise<RitualTemplateRow | null> {
    const [row] = await this.db
      .select()
      .from(ritualTemplates)
      .where(eq(ritualTemplates.id, id))
      .limit(1);

    return row ? this.toRow(row) : null;
  }

  async cloneForUser(
    builtInId: string,
    userId: string
  ): Promise<RitualTemplateRow> {
    const source = await this.findById(builtInId);
    if (!source) {
      throw new Error(`Ritual template ${builtInId} not found`);
    }

    const [inserted] = await this.db
      .insert(ritualTemplates)
      .values({
        userId,
        name: source.name,
        description: source.description,
        platform: source.platform,
        promptTemplate: source.promptTemplate,
        recurrence: source.recurrence,
        dayOfWeek: source.dayOfWeek,
        isActive: true,
        sourceTemplateId: builtInId,
      })
      .returning();

    return this.toRow(inserted);
  }

  async setActive(
    id: string,
    userId: string,
    isActive: boolean
  ): Promise<void> {
    await this.db
      .update(ritualTemplates)
      .set({ isActive })
      .where(
        and(eq(ritualTemplates.id, id), eq(ritualTemplates.userId, userId))
      );
  }
}
