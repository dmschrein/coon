import { describe, it, expect } from "vitest";
import {
  computeEventSchedule,
  ANNOUNCEMENT_OFFSET_DAYS,
  REMINDER_OFFSET_DAYS,
  DAY_OF_OFFSET_HOURS,
} from "../event-service";

describe("computeEventSchedule", () => {
  const eventDatetime = new Date("2026-06-01T18:00:00.000Z");

  it("produces three entries in the documented order", () => {
    const schedule = computeEventSchedule(eventDatetime);
    expect(schedule.map((s) => s.type)).toEqual([
      "announcement",
      "reminder",
      "day_of",
    ]);
  });

  it("schedules the announcement 7 days before the event", () => {
    const [announcement] = computeEventSchedule(eventDatetime);
    expect(announcement.scheduledFor.getTime()).toBe(
      eventDatetime.getTime() - ANNOUNCEMENT_OFFSET_DAYS * 86_400_000
    );
  });

  it("schedules the reminder 1 day before the event", () => {
    const [, reminder] = computeEventSchedule(eventDatetime);
    expect(reminder.scheduledFor.getTime()).toBe(
      eventDatetime.getTime() - REMINDER_OFFSET_DAYS * 86_400_000
    );
  });

  it("schedules the day-of post 2 hours before the event start", () => {
    const [, , dayOf] = computeEventSchedule(eventDatetime);
    expect(dayOf.scheduledFor.getTime()).toBe(
      eventDatetime.getTime() - DAY_OF_OFFSET_HOURS * 3_600_000
    );
  });

  it("preserves the original event datetime (no mutation)", () => {
    const original = eventDatetime.getTime();
    computeEventSchedule(eventDatetime);
    expect(eventDatetime.getTime()).toBe(original);
  });

  it("returns offsets that are strictly increasing in time (announcement < reminder < day_of)", () => {
    const schedule = computeEventSchedule(eventDatetime);
    expect(schedule[0].scheduledFor.getTime()).toBeLessThan(
      schedule[1].scheduledFor.getTime()
    );
    expect(schedule[1].scheduledFor.getTime()).toBeLessThan(
      schedule[2].scheduledFor.getTime()
    );
  });
});
