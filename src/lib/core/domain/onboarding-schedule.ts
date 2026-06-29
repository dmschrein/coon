/**
 * Onboarding schedule — pure domain logic for the new-member onboarding
 * sequence. No DB or framework imports.
 *
 * A sequence is always exactly 5 steps fired at fixed offsets relative to the
 * moment the member joins (here: the sequence's `createdAt`).
 */

export const ONBOARDING_TIMINGS = [
  "immediate",
  "day1",
  "day3",
  "day7",
  "day14",
] as const;

export type OnboardingTiming = (typeof ONBOARDING_TIMINGS)[number];

export const ONBOARDING_CHANNELS = [
  "email",
  "discord_dm",
  "in_app",
  "sms",
] as const;

export type OnboardingChannel = (typeof ONBOARDING_CHANNELS)[number];

const OFFSET_DAYS: Record<OnboardingTiming, number> = {
  immediate: 0,
  day1: 1,
  day3: 3,
  day7: 7,
  day14: 14,
};

const DAY_MS = 86_400_000;

/** Whole-day delay applied to a step with the given trigger timing. */
export function timingOffsetDays(timing: OnboardingTiming): number {
  return OFFSET_DAYS[timing];
}

/** The scheduled date for a step, computed from a base join date. */
export function scheduledDateFor(base: Date, timing: OnboardingTiming): Date {
  return new Date(base.getTime() + OFFSET_DAYS[timing] * DAY_MS);
}

/** Human-friendly label for a trigger timing, used in the timeline UI. */
export const ONBOARDING_TIMING_LABELS: Record<OnboardingTiming, string> = {
  immediate: "Immediate",
  day1: "Day 1",
  day3: "Day 3",
  day7: "Day 7",
  day14: "Day 14",
};
