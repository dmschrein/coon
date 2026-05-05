import { describe, it, expect } from "vitest";
import { DEFAULT_POSTING_TIME, nextOccurrences } from "../ritual-schedule";

describe("nextOccurrences", () => {
  it("DEFAULT_POSTING_TIME is 09:00", () => {
    expect(DEFAULT_POSTING_TIME).toBe("09:00");
  });

  it("generates 8 weekly occurrences on the requested day", () => {
    // Tuesday 2026-05-05
    const from = new Date(Date.UTC(2026, 4, 5, 12, 0, 0));
    const occurrences = nextOccurrences("weekly", 3 /* Wed */, 8, from);

    expect(occurrences).toHaveLength(8);
    for (const d of occurrences) {
      expect(d.getUTCDay()).toBe(3);
      expect(d.getUTCHours()).toBe(9);
    }
    // Each occurrence is 7 days apart
    for (let i = 1; i < occurrences.length; i++) {
      const delta = occurrences[i].getTime() - occurrences[i - 1].getTime();
      expect(delta).toBe(7 * 86_400_000);
    }
  });

  it("schedules same-day occurrence on next week when called past the time", () => {
    // Wednesday 2026-05-06 at 15:00 UTC — past 09:00 default
    const from = new Date(Date.UTC(2026, 4, 6, 15, 0, 0));
    const occurrences = nextOccurrences("weekly", 3 /* Wed */, 8, from);

    expect(occurrences[0].getUTCDate()).toBe(13); // next Wednesday
    expect(occurrences[0].getUTCHours()).toBe(9);
  });

  it("biweekly: 14-day stride", () => {
    const from = new Date(Date.UTC(2026, 4, 5, 12, 0, 0));
    const occurrences = nextOccurrences("biweekly", 1 /* Mon */, 8, from);

    expect(occurrences).toHaveLength(8);
    for (let i = 1; i < occurrences.length; i++) {
      const delta = occurrences[i].getTime() - occurrences[i - 1].getTime();
      expect(delta).toBe(14 * 86_400_000);
    }
  });

  it("monthly: 8 occurrences on the 1st of subsequent months", () => {
    const from = new Date(Date.UTC(2026, 4, 15, 12, 0, 0)); // mid-May
    const occurrences = nextOccurrences("monthly", null, 8, from);

    expect(occurrences).toHaveLength(8);
    expect(occurrences[0]).toEqual(new Date(Date.UTC(2026, 5, 1, 9))); // June 1
    expect(occurrences[7]).toEqual(new Date(Date.UTC(2027, 0, 1, 9))); // Jan 1 next year
    for (const d of occurrences) {
      expect(d.getUTCDate()).toBe(1);
    }
  });

  it("monthly tolerates missing dayOfWeek", () => {
    const from = new Date(Date.UTC(2026, 4, 15, 12));
    expect(() => nextOccurrences("monthly", null, 1, from)).not.toThrow();
  });

  it("weekly throws when dayOfWeek is missing", () => {
    const from = new Date(Date.UTC(2026, 4, 5, 12));
    expect(() => nextOccurrences("weekly", null, 8, from)).toThrow();
  });
});
