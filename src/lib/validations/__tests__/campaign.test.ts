import { describe, it, expect } from "vitest";
import {
  campaignStrategySchema,
  messagingFrameworkSchema,
  platformAllocationSchema,
  campaignCalendarSchema,
  calendarEntrySchema,
  campaignPlatformSchema,
} from "../campaign";
import { campaignStrategyFixture } from "@/lib/agents/__fixtures__/campaign";

describe("campaignPlatformSchema", () => {
  it("accepts all valid platform values", () => {
    const platforms = [
      "blog",
      "instagram",
      "tiktok",
      "twitter",
      "pinterest",
      "youtube",
      "linkedin",
      "reddit",
      "discord",
      "threads",
      "email",
    ];
    for (const platform of platforms) {
      expect(() => campaignPlatformSchema.parse(platform)).not.toThrow();
    }
  });

  it("rejects invalid platform", () => {
    expect(() => campaignPlatformSchema.parse("facebook")).toThrow();
  });
});

describe("messagingFrameworkSchema", () => {
  const valid = campaignStrategyFixture.messagingFramework;

  it("accepts valid messaging framework", () => {
    expect(() => messagingFrameworkSchema.parse(valid)).not.toThrow();
  });

  it("rejects empty coreMessage", () => {
    expect(() =>
      messagingFrameworkSchema.parse({ ...valid, coreMessage: "" })
    ).toThrow();
  });

  it("rejects empty supportingMessages array", () => {
    expect(() =>
      messagingFrameworkSchema.parse({ ...valid, supportingMessages: [] })
    ).toThrow();
  });
});

describe("platformAllocationSchema", () => {
  const valid = campaignStrategyFixture.platformAllocations[0];

  it("accepts valid platform allocation", () => {
    expect(() => platformAllocationSchema.parse(valid)).not.toThrow();
  });

  it("rejects non-positive priorityOrder", () => {
    expect(() =>
      platformAllocationSchema.parse({ ...valid, priorityOrder: 0 })
    ).toThrow();
  });

  it("rejects non-integer priorityOrder", () => {
    expect(() =>
      platformAllocationSchema.parse({ ...valid, priorityOrder: 1.5 })
    ).toThrow();
  });
});

describe("campaignStrategySchema", () => {
  it("accepts valid campaign strategy from fixture", () => {
    expect(() =>
      campaignStrategySchema.parse(campaignStrategyFixture)
    ).not.toThrow();
  });

  it("rejects empty campaignName", () => {
    expect(() =>
      campaignStrategySchema.parse({
        ...campaignStrategyFixture,
        campaignName: "",
      })
    ).toThrow();
  });

  it("rejects non-positive timelineWeeks", () => {
    expect(() =>
      campaignStrategySchema.parse({
        ...campaignStrategyFixture,
        timelineWeeks: 0,
      })
    ).toThrow();
  });

  it("rejects empty platformAllocations", () => {
    expect(() =>
      campaignStrategySchema.parse({
        ...campaignStrategyFixture,
        platformAllocations: [],
      })
    ).toThrow();
  });

  it("rejects empty contentPillars", () => {
    expect(() =>
      campaignStrategySchema.parse({
        ...campaignStrategyFixture,
        contentPillars: [],
      })
    ).toThrow();
  });
});

describe("calendarEntrySchema", () => {
  const valid = {
    dayNumber: 1,
    platform: "twitter" as const,
    contentType: "thread",
    title: "Launch day thread",
    postingTime: "09:00 AM EST",
    pillar: "Build in Public",
  };

  it("accepts valid calendar entry", () => {
    expect(() => calendarEntrySchema.parse(valid)).not.toThrow();
  });

  it("accepts entry with optional notes", () => {
    expect(() =>
      calendarEntrySchema.parse({ ...valid, notes: "High priority" })
    ).not.toThrow();
  });

  it("rejects non-positive dayNumber", () => {
    expect(() =>
      calendarEntrySchema.parse({ ...valid, dayNumber: 0 })
    ).toThrow();
  });
});

describe("campaignCalendarSchema", () => {
  const valid = {
    startDate: "2026-06-01",
    endDate: "2026-06-28",
    totalPosts: 20,
    entries: [
      {
        dayNumber: 1,
        platform: "twitter" as const,
        contentType: "thread",
        title: "Launch day",
        postingTime: "09:00",
        pillar: "Build in Public",
      },
    ],
    weeklyOverview: [
      { week: 1, focus: "Awareness", platforms: ["twitter", "linkedin"] },
    ],
  };

  it("accepts valid campaign calendar", () => {
    expect(() => campaignCalendarSchema.parse(valid)).not.toThrow();
  });

  it("rejects empty entries", () => {
    expect(() =>
      campaignCalendarSchema.parse({ ...valid, entries: [] })
    ).toThrow();
  });
});
