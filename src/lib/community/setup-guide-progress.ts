/**
 * Pure helpers for setup-guide step progress. Shared by the API route, the
 * modal, and tests so the step-key scheme and completion rule never drift.
 */

import type { SetupGuideOutput } from "@/types";

/** Stable key for a step, by its position in the guide. */
export function setupGuideStepKey(
  sectionIndex: number,
  stepIndex: number
): string {
  return `${sectionIndex}:${stepIndex}`;
}

/** Every valid step key in the guide. */
export function setupGuideStepKeys(guide: SetupGuideOutput): string[] {
  return guide.checklist.flatMap((section, sectionIndex) =>
    section.steps.map((_step, stepIndex) =>
      setupGuideStepKey(sectionIndex, stepIndex)
    )
  );
}

/** Total number of steps across all sections. */
export function countSetupGuideSteps(guide: SetupGuideOutput): number {
  return guide.checklist.reduce(
    (total, section) => total + section.steps.length,
    0
  );
}

/** True when every step in the guide is present in `completedSteps`. */
export function isSetupGuideComplete(
  guide: SetupGuideOutput,
  completedSteps: string[]
): boolean {
  const keys = setupGuideStepKeys(guide);
  if (keys.length === 0) return false;
  const done = new Set(completedSteps);
  return keys.every((key) => done.has(key));
}
