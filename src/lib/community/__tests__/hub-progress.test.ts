import { describe, it, expect } from "vitest";
import { hubProgressPercent, resolveHubItems } from "../hub-progress";
import type { CommunityHubData } from "@/types";

function makeData(overrides: Partial<CommunityHubData> = {}): CommunityHubData {
  return {
    hasManifesto: false,
    completedSetupGuides: [],
    hasRules: false,
    hasActiveOnboarding: false,
    memberCount: 0,
    ...overrides,
  };
}

describe("hubProgressPercent", () => {
  it("is 0 when nothing is complete", () => {
    expect(hubProgressPercent(makeData())).toBe(0);
  });

  it("is 100 when all four gates are complete", () => {
    expect(
      hubProgressPercent(
        makeData({
          hasManifesto: true,
          completedSetupGuides: ["discord"],
          hasRules: true,
          hasActiveOnboarding: true,
        })
      )
    ).toBe(100);
  });

  it("is 50 when the first two gates are complete", () => {
    expect(
      hubProgressPercent(
        makeData({ hasManifesto: true, completedSetupGuides: ["reddit"] })
      )
    ).toBe(50);
  });

  it("counts a setup guide only when at least one is completed", () => {
    expect(hubProgressPercent(makeData({ completedSetupGuides: [] }))).toBe(0);
    expect(
      hubProgressPercent(makeData({ completedSetupGuides: ["slack"] }))
    ).toBe(25);
  });
});

describe("resolveHubItems", () => {
  it("locks every step after the first incomplete one", () => {
    const items = resolveHubItems(makeData());
    expect(items.map((i) => i.locked)).toEqual([false, true, true, true]);
  });

  it("points every locked step at the first unmet prerequisite", () => {
    const items = resolveHubItems(makeData());
    const rules = items.find((i) => i.key === "rules");
    expect(rules?.lockMessage).toBe("Complete manifesto first");
  });

  it("unlocks the next step once its predecessor is done", () => {
    const items = resolveHubItems(
      makeData({ hasManifesto: true, completedSetupGuides: ["discord"] })
    );
    const rules = items.find((i) => i.key === "rules");
    const onboarding = items.find((i) => i.key === "onboarding");
    expect(rules?.locked).toBe(false);
    expect(onboarding?.locked).toBe(true);
    expect(onboarding?.lockMessage).toBe("Complete rules first");
  });

  it("locks nothing when every step is complete", () => {
    const items = resolveHubItems(
      makeData({
        hasManifesto: true,
        completedSetupGuides: ["discord"],
        hasRules: true,
        hasActiveOnboarding: true,
      })
    );
    expect(items.every((i) => !i.locked)).toBe(true);
    expect(items.every((i) => i.done)).toBe(true);
  });
});
