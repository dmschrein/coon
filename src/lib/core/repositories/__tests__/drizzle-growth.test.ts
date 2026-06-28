import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { DrizzleGrowthRepository, assembleSummary } from "../drizzle-growth";
import { makeFakeDb } from "./fake-db";

// Fix "now" so ISO-week labels are deterministic.
const NOW = new Date("2026-05-15T12:00:00Z");

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("assembleSummary", () => {
  it("builds an 8-week window padding missing weeks with 0", () => {
    const summary = assembleSummary({
      memberWeeks: [],
      statusRows: [],
      topContent: [],
      topPlatform: [],
      now: NOW,
    });

    expect(summary.memberCountByWeek).toHaveLength(8);
    expect(summary.memberCountByWeek.every((w) => w.count === 0)).toBe(true);
    expect(summary.newMembersThisWeek).toBe(0);
    expect(summary.newMembersLastWeek).toBe(0);
    expect(summary.topConvertingPlatform).toBe("");
    expect(summary.prospectsInPipeline).toBe(0);
    expect(summary.prospectConversionRate).toBe(0);
  });

  it("fills this/last week counts from the db week map", () => {
    // Build labels the same way the implementation does to find this/last week.
    const probe = assembleSummary({
      memberWeeks: [],
      statusRows: [],
      topContent: [],
      topPlatform: [],
      now: NOW,
    });
    const labels = probe.memberCountByWeek.map((w) => w.week);
    const thisWeek = labels[labels.length - 1];
    const lastWeek = labels[labels.length - 2];

    const summary = assembleSummary({
      memberWeeks: [
        { week: thisWeek, count: 4 },
        { week: lastWeek, count: 2 },
        { week: null, count: 99 }, // null week ignored
      ],
      statusRows: [],
      topContent: [],
      topPlatform: [],
      now: NOW,
    });

    expect(summary.newMembersThisWeek).toBe(4);
    expect(summary.newMembersLastWeek).toBe(2);
  });

  it("computes conversion rate, pipeline and prospectsByStatus", () => {
    const summary = assembleSummary({
      memberWeeks: [],
      statusRows: [
        { status: "cold", count: 10 },
        { status: "contacted", count: 3 },
        { status: "responded", count: 2 },
        { status: "joined", count: 5 },
        { status: "unknown", count: 100 }, // ignored
      ],
      topContent: [],
      topPlatform: [],
      now: NOW,
    });

    expect(summary.prospectsByStatus).toEqual({
      cold: 10,
      contacted: 3,
      responded: 2,
      joined: 5,
    });
    expect(summary.prospectsInPipeline).toBe(15);
    expect(summary.prospectConversionRate).toBe(50);
  });

  it("returns 0 conversion rate when cold is 0", () => {
    const summary = assembleSummary({
      memberWeeks: [],
      statusRows: [{ status: "joined", count: 5 }],
      topContent: [],
      topPlatform: [],
      now: NOW,
    });

    expect(summary.prospectConversionRate).toBe(0);
  });

  it("maps top converting content, defaulting null titles to Untitled", () => {
    const summary = assembleSummary({
      memberWeeks: [],
      statusRows: [],
      topContent: [
        { title: "Best Post", joins: 7 },
        { title: null, joins: 3 },
      ],
      topPlatform: [{ platform: "twitter", count: 12 }],
      now: NOW,
    });

    expect(summary.topConvertingContent).toEqual([
      { title: "Best Post", joins: 7 },
      { title: "Untitled", joins: 3 },
    ]);
    expect(summary.topConvertingPlatform).toBe("twitter");
  });
});

describe("DrizzleGrowthRepository.getSummary", () => {
  it("issues four queries and assembles the summary", async () => {
    const { db, queue } = makeFakeDb();
    // Order: memberWeeks, prospectStatus, topContent, topPlatform.
    queue.select.push([]); // memberWeeks
    queue.select.push([
      { status: "cold", count: 4 },
      { status: "joined", count: 1 },
    ]); // status
    queue.select.push([{ title: "Hit", joins: 2 }]); // topContent
    queue.select.push([{ platform: "instagram", count: 9 }]); // topPlatform
    const repo = new DrizzleGrowthRepository(db);

    const summary = await repo.getSummary("user_123");

    expect(summary.memberCountByWeek).toHaveLength(8);
    expect(summary.prospectsByStatus.cold).toBe(4);
    expect(summary.prospectsByStatus.joined).toBe(1);
    expect(summary.prospectConversionRate).toBe(25);
    expect(summary.topConvertingContent).toEqual([{ title: "Hit", joins: 2 }]);
    expect(summary.topConvertingPlatform).toBe("instagram");
  });
});
