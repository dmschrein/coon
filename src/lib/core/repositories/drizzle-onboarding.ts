/**
 * Drizzle Onboarding Repository — data access for new-member onboarding
 * sequences and their steps.
 *
 * Activating a sequence flips `is_active` on and seeds one calendar entry per
 * step, scheduled relative to the sequence's `createdAt` (the join date):
 * immediate = +0d, day1 = +1d, day3 = +3d, day7 = +7d, day14 = +14d. The date
 * arithmetic lives here (domain helper), never in the route handler.
 */

import { asc, desc, eq } from "drizzle-orm";
import {
  onboardingSequence,
  onboardingStep,
  campaignCalendarEntries,
} from "@/lib/db/schema";
import {
  scheduledDateFor,
  type OnboardingTiming,
} from "../domain/onboarding-schedule";
import type {
  OnboardingSequence,
  OnboardingSequenceWithSteps,
  OnboardingStep,
} from "@/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DrizzleDb = any;

type SequenceRow = typeof onboardingSequence.$inferSelect;
type StepRow = typeof onboardingStep.$inferSelect;

function mapSequence(row: SequenceRow): OnboardingSequence {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    isActive: row.isActive,
    createdAt: row.createdAt,
  };
}

function mapStep(row: StepRow): OnboardingStep {
  return {
    id: row.id,
    stepNumber: row.stepNumber,
    triggerTiming: row.triggerTiming as OnboardingTiming,
    channel: row.channel as OnboardingStep["channel"],
    subject: row.subject,
    content: row.content,
  };
}

export interface ActivateSequenceResult {
  sequenceId: string;
  count: number;
}

export class DrizzleOnboardingRepository {
  constructor(private db: DrizzleDb) {}

  async createSequence(data: {
    userId: string;
    name?: string;
  }): Promise<OnboardingSequence> {
    const [row] = await this.db
      .insert(onboardingSequence)
      .values({
        userId: data.userId,
        ...(data.name ? { name: data.name } : {}),
      })
      .returning();
    return mapSequence(row);
  }

  /** The user's most recent sequence with its steps (ordered), or null. */
  async getSequence(
    userId: string
  ): Promise<OnboardingSequenceWithSteps | null> {
    const [seq] = await this.db
      .select()
      .from(onboardingSequence)
      .where(eq(onboardingSequence.userId, userId))
      .orderBy(desc(onboardingSequence.createdAt))
      .limit(1);

    if (!seq) return null;

    const steps = await this.db
      .select()
      .from(onboardingStep)
      .where(eq(onboardingStep.sequenceId, seq.id))
      .orderBy(asc(onboardingStep.stepNumber));

    return { ...mapSequence(seq), steps: steps.map(mapStep) };
  }

  /** Insert or replace a step by its (sequenceId, stepNumber) slot. */
  async upsertStep(
    sequenceId: string,
    step: OnboardingStep
  ): Promise<OnboardingStep> {
    const values = {
      sequenceId,
      stepNumber: step.stepNumber,
      triggerTiming: step.triggerTiming,
      channel: step.channel,
      subject: step.subject ?? null,
      content: step.content,
    };

    const [row] = await this.db
      .insert(onboardingStep)
      .values(values)
      .onConflictDoUpdate({
        target: [onboardingStep.sequenceId, onboardingStep.stepNumber],
        set: {
          triggerTiming: values.triggerTiming,
          channel: values.channel,
          subject: values.subject,
          content: values.content,
        },
      })
      .returning();

    return mapStep(row);
  }

  /**
   * Activate the sequence: set `is_active = true` and create one calendar
   * entry per step, scheduled from the sequence's `createdAt`.
   */
  async activateSequence(id: string): Promise<ActivateSequenceResult> {
    const [seq] = await this.db
      .update(onboardingSequence)
      .set({ isActive: true })
      .where(eq(onboardingSequence.id, id))
      .returning();

    if (!seq) {
      throw new Error(`Onboarding sequence ${id} not found`);
    }

    const steps: StepRow[] = await this.db
      .select()
      .from(onboardingStep)
      .where(eq(onboardingStep.sequenceId, id))
      .orderBy(asc(onboardingStep.stepNumber));

    const base = seq.createdAt ? new Date(seq.createdAt) : new Date();

    await this.db.insert(campaignCalendarEntries).values(
      steps.map((step, index) => ({
        campaignId: null,
        userId: seq.userId,
        dayNumber: step.stepNumber ?? index + 1,
        platform: step.channel,
        contentType: "onboarding",
        title: step.subject ?? `Onboarding: ${step.triggerTiming}`,
        scheduledDate: scheduledDateFor(
          base,
          step.triggerTiming as OnboardingTiming
        ),
        onboardingStepId: step.id,
      }))
    );

    return { sequenceId: id, count: steps.length };
  }
}
