/**
 * Drizzle Workflow Repository - Data access for user-defined workflow triggers.
 */

import { eq, and, asc, type SQL } from "drizzle-orm";
import { workflowTriggers } from "@/lib/db/schema";
import type { WorkflowAction } from "@/lib/validations/workflow";
import type { WorkflowRepository, WorkflowTriggerRow } from "./interfaces";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DrizzleDb = any;

export class DrizzleWorkflowRepository implements WorkflowRepository {
  constructor(private db: DrizzleDb) {}

  private toRow(row: typeof workflowTriggers.$inferSelect): WorkflowTriggerRow {
    return {
      id: row.id,
      userId: row.userId,
      name: row.name,
      eventType: row.eventType,
      conditions: (row.conditions ?? {}) as Record<string, unknown>,
      actions: (row.actions ?? []) as WorkflowAction[],
      isActive: row.isActive,
      createdAt: row.createdAt,
    };
  }

  async listActiveForUserAndEvent(
    userId: string,
    eventType: string
  ): Promise<WorkflowTriggerRow[]> {
    const rows = await this.db
      .select()
      .from(workflowTriggers)
      .where(
        and(
          eq(workflowTriggers.userId, userId),
          eq(workflowTriggers.eventType, eventType),
          eq(workflowTriggers.isActive, true)
        )
      )
      .orderBy(asc(workflowTriggers.createdAt));

    return rows.map((row: typeof workflowTriggers.$inferSelect) =>
      this.toRow(row)
    );
  }

  async listForUser(userId: string): Promise<WorkflowTriggerRow[]> {
    const rows = await this.db
      .select()
      .from(workflowTriggers)
      .where(eq(workflowTriggers.userId, userId))
      .orderBy(asc(workflowTriggers.createdAt));

    return rows.map((row: typeof workflowTriggers.$inferSelect) =>
      this.toRow(row)
    );
  }

  async findById(
    id: string,
    userId: string
  ): Promise<WorkflowTriggerRow | null> {
    const [row] = await this.db
      .select()
      .from(workflowTriggers)
      .where(
        and(eq(workflowTriggers.id, id), eq(workflowTriggers.userId, userId))
      )
      .limit(1);

    return row ? this.toRow(row) : null;
  }

  async create(params: {
    userId: string;
    name: string;
    eventType: string;
    conditions: Record<string, unknown>;
    actions: WorkflowAction[];
    isActive: boolean;
  }): Promise<WorkflowTriggerRow> {
    const [row] = await this.db
      .insert(workflowTriggers)
      .values({
        userId: params.userId,
        name: params.name,
        eventType: params.eventType,
        conditions: params.conditions,
        actions: params.actions,
        isActive: params.isActive,
      })
      .returning();

    return this.toRow(row);
  }

  async update(
    id: string,
    userId: string,
    patch: {
      name?: string;
      eventType?: string;
      conditions?: Record<string, unknown>;
      actions?: WorkflowAction[];
      isActive?: boolean;
    }
  ): Promise<WorkflowTriggerRow | null> {
    const setClause: Record<string, unknown> = {};
    if (patch.name !== undefined) setClause.name = patch.name;
    if (patch.eventType !== undefined) setClause.eventType = patch.eventType;
    if (patch.conditions !== undefined) setClause.conditions = patch.conditions;
    if (patch.actions !== undefined) setClause.actions = patch.actions;
    if (patch.isActive !== undefined) setClause.isActive = patch.isActive;

    if (Object.keys(setClause).length === 0) {
      return this.findById(id, userId);
    }

    const where: SQL[] = [
      eq(workflowTriggers.id, id),
      eq(workflowTriggers.userId, userId),
    ];

    const [updated] = await this.db
      .update(workflowTriggers)
      .set(setClause)
      .where(and(...where))
      .returning();

    return updated ? this.toRow(updated) : null;
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.db
      .delete(workflowTriggers)
      .where(
        and(eq(workflowTriggers.id, id), eq(workflowTriggers.userId, userId))
      );
  }
}
