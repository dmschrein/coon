/**
 * Ritual scheduling - pure date math for generating recurrence occurrences.
 * No DB or framework imports.
 */

import type { RitualRecurrence } from "../repositories/interfaces";

const DEFAULT_HOUR_UTC = 9;

export const DEFAULT_POSTING_TIME = "09:00";

export function nextOccurrences(
  recurrence: RitualRecurrence,
  dayOfWeek: number | null,
  count = 8,
  from: Date = new Date()
): Date[] {
  if (recurrence === "monthly") {
    return monthlyOccurrences(from, count);
  }
  if (dayOfWeek === null) {
    throw new Error(`dayOfWeek is required for recurrence "${recurrence}"`);
  }
  const stride = recurrence === "biweekly" ? 14 : 7;
  return weeklyOccurrences(from, dayOfWeek, stride, count);
}

function weeklyOccurrences(
  from: Date,
  dayOfWeek: number,
  strideDays: number,
  count: number
): Date[] {
  const start = atUtcHour(from, DEFAULT_HOUR_UTC);
  const currentDow = start.getUTCDay();
  let delta = (dayOfWeek - currentDow + 7) % 7;
  if (delta === 0 && start.getTime() <= from.getTime()) {
    delta = 7;
  }
  const first = addDays(start, delta);

  const occurrences: Date[] = [];
  for (let i = 0; i < count; i++) {
    occurrences.push(addDays(first, i * strideDays));
  }
  return occurrences;
}

function monthlyOccurrences(from: Date, count: number): Date[] {
  const occurrences: Date[] = [];
  const baseYear = from.getUTCFullYear();
  const baseMonth = from.getUTCMonth();
  for (let i = 1; i <= count; i++) {
    occurrences.push(
      new Date(Date.UTC(baseYear, baseMonth + i, 1, DEFAULT_HOUR_UTC, 0, 0, 0))
    );
  }
  return occurrences;
}

function atUtcHour(date: Date, hour: number): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      hour,
      0,
      0,
      0
    )
  );
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}
