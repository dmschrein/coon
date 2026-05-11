import { describe, it, expect } from "vitest";
import { DrizzleProspectRepository } from "../drizzle-prospect";

type PerContentRow = {
  contentId: string;
  title: string | null;
  pillar: string | null;
  platform: string;
  joins: number;
};

// Fake Drizzle query chain that returns a fixed result when awaited.
function fakeDb(rows: PerContentRow[]) {
  const chain: Record<string, unknown> = {};
  for (const method of [
    "select",
    "from",
    "innerJoin",
    "where",
    "groupBy",
    "orderBy",
  ]) {
    chain[method] = () => chain;
  }
  // Make the chain awaitable
  (chain as unknown as PromiseLike<PerContentRow[]>).then = (
    onFulfilled: (value: PerContentRow[]) => unknown
  ) => Promise.resolve(rows).then(onFulfilled);
  return chain;
}

describe("DrizzleProspectRepository.getGrowthAttribution", () => {
  it("returns empty state when no joined prospects exist", async () => {
    const repo = new DrizzleProspectRepository(fakeDb([]));

    const result = await repo.getGrowthAttribution("user_1");

    expect(result.topConvertingContent).toEqual([]);
    expect(result.topConvertingPlatform).toBeNull();
    expect(result.topConvertingPillar).toBeNull();
    expect(result.joinsByPillar).toEqual([]);
    expect(result.totalJoins).toBe(0);
  });

  it("aggregates joins across content pieces and pillars", async () => {
    const rows: PerContentRow[] = [
      {
        contentId: "c1",
        title: "A",
        pillar: "education",
        platform: "twitter",
        joins: 5,
      },
      {
        contentId: "c2",
        title: "B",
        pillar: "education",
        platform: "twitter",
        joins: 3,
      },
      {
        contentId: "c3",
        title: "C",
        pillar: "story",
        platform: "instagram",
        joins: 4,
      },
    ];
    const repo = new DrizzleProspectRepository(fakeDb(rows));

    const result = await repo.getGrowthAttribution("user_1");

    expect(result.totalJoins).toBe(12);
    expect(result.topConvertingPillar).toEqual({
      pillar: "education",
      joins: 8,
    });
    expect(result.topConvertingPlatform).toEqual({
      platform: "twitter",
      joins: 8,
    });
    expect(result.joinsByPillar).toEqual([
      { pillar: "education", joins: 8 },
      { pillar: "story", joins: 4 },
    ]);
  });

  it("caps topConvertingContent at 5 entries", async () => {
    const rows: PerContentRow[] = Array.from({ length: 7 }, (_, i) => ({
      contentId: `c${i}`,
      title: `Piece ${i}`,
      pillar: `pillar-${i}`,
      platform: "twitter",
      joins: 7 - i,
    }));
    const repo = new DrizzleProspectRepository(fakeDb(rows));

    const result = await repo.getGrowthAttribution("user_1");

    expect(result.topConvertingContent).toHaveLength(5);
    expect(result.topConvertingContent[0].contentId).toBe("c0");
    expect(result.topConvertingContent[4].contentId).toBe("c4");
    expect(result.joinsByPillar).toHaveLength(7);
  });

  it("groups null pillars under 'uncategorized'", async () => {
    const rows: PerContentRow[] = [
      {
        contentId: "c1",
        title: null,
        pillar: null,
        platform: "twitter",
        joins: 2,
      },
      {
        contentId: "c2",
        title: null,
        pillar: null,
        platform: "twitter",
        joins: 1,
      },
    ];
    const repo = new DrizzleProspectRepository(fakeDb(rows));

    const result = await repo.getGrowthAttribution("user_1");

    expect(result.joinsByPillar).toEqual([
      { pillar: "uncategorized", joins: 3 },
    ]);
    expect(result.topConvertingPillar).toEqual({
      pillar: "uncategorized",
      joins: 3,
    });
  });
});
