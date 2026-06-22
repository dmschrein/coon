import { describe, it, expect, vi, beforeEach } from "vitest";
import { assessMonetizationReadiness } from "../monetization-readiness";
import type { ReadinessInput, ReadinessOutput } from "@/types";

vi.mock("@/lib/claude", () => ({
  anthropic: {
    messages: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db", () => ({
  db: { insert: vi.fn().mockReturnValue({ values: vi.fn() }) },
}));

vi.mock("@/lib/db/schema", () => ({
  agentRuns: {},
}));

import { anthropic } from "@/lib/claude";

const mockCreate = vi.mocked(anthropic.messages.create);

const tinyInput: ReadinessInput = {
  selectedModels: ["paid_membership"],
  community: {
    memberCount: 10,
    weeksActive: 1,
    avgReachPerPost: 5,
    engagementRate: 0.01,
    nicheDefined: false,
    transformationClarity: "none",
  },
};

const strongInput: ReadinessInput = {
  selectedModels: ["paid_membership"],
  community: {
    memberCount: 600,
    weeksActive: 12,
    avgReachPerPost: 2000,
    engagementRate: 0.15,
    nicheDefined: true,
    transformationClarity: "clear",
  },
};

const multiModelInput: ReadinessInput = {
  selectedModels: ["paid_membership", "courses", "events"],
  community: {
    memberCount: 250,
    weeksActive: 8,
    avgReachPerPost: 400,
    engagementRate: 0.08,
    nicheDefined: true,
    transformationClarity: "clear",
  },
};

function mockClaude(payload: ReadinessOutput) {
  mockCreate.mockResolvedValue({
    content: [{ type: "text", text: JSON.stringify(payload) }],
    usage: { input_tokens: 500, output_tokens: 1000 },
  } as Awaited<ReturnType<typeof anthropic.messages.create>>);
}

describe("assessMonetizationReadiness", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("scores paid_membership below 70 with readyToLaunch=false for a 10-member community", async () => {
    mockClaude({
      models: [
        {
          name: "paid_membership",
          score: 30,
          benchmark: "500+ members + 8+ weeks active",
          topActions: [
            "Grow to at least 500 members",
            "Stay active for 8+ weeks",
            "Engage members daily",
          ],
          readyToLaunch: false,
        },
      ],
      overallScore: 30,
      summary: "Community is too small and too new for paid membership.",
    });

    const { result } = await assessMonetizationReadiness(tinyInput);
    const paid = result.models.find((m) => m.name === "paid_membership")!;

    expect(paid.score).toBeLessThan(70);
    expect(paid.readyToLaunch).toBe(false);
  });

  it("scores paid_membership at or above 70 with readyToLaunch=true for 600 members + high engagement", async () => {
    mockClaude({
      models: [
        {
          name: "paid_membership",
          score: 85,
          benchmark: "500+ members + 8+ weeks active",
          topActions: [
            "Launch a paid tier in the next 4 weeks",
            "Survey top engagers for pricing",
            "Build a private members-only space",
          ],
          readyToLaunch: true,
        },
      ],
      overallScore: 85,
      summary: "Community has the scale and engagement for paid membership.",
    });

    const { result } = await assessMonetizationReadiness(strongInput);
    const paid = result.models.find((m) => m.name === "paid_membership")!;

    expect(paid.score).toBeGreaterThanOrEqual(70);
    expect(paid.readyToLaunch).toBe(true);
  });

  it("returns one model entry per selectedModels item", async () => {
    mockClaude({
      models: [
        {
          name: "paid_membership",
          score: 60,
          benchmark: "500+ members + 8+ weeks active",
          topActions: ["Action A"],
          readyToLaunch: false,
        },
        {
          name: "courses",
          score: 80,
          benchmark: "200+ members + clear transformation",
          topActions: ["Action B"],
          readyToLaunch: true,
        },
        {
          name: "events",
          score: 90,
          benchmark: "100+ members",
          topActions: ["Action C"],
          readyToLaunch: true,
        },
      ],
      overallScore: 76,
      summary: "Mixed readiness across the three models selected.",
    });

    const { result } = await assessMonetizationReadiness(multiModelInput);

    expect(result.models).toHaveLength(3);
    expect(result.models.map((m) => m.name).sort()).toEqual(
      ["courses", "events", "paid_membership"].sort()
    );
  });

  it("each model entry has name, integer score 0-100, benchmark, topActions array, readyToLaunch boolean", async () => {
    mockClaude({
      models: [
        {
          name: "paid_membership",
          score: 85,
          benchmark: "500+ members + 8+ weeks active",
          topActions: ["Launch", "Survey", "Build space"],
          readyToLaunch: true,
        },
      ],
      overallScore: 85,
      summary: "Ready.",
    });

    const { result } = await assessMonetizationReadiness(strongInput);
    const model = result.models[0];

    expect(model.name).toBe("paid_membership");
    expect(Number.isInteger(model.score)).toBe(true);
    expect(model.score).toBeGreaterThanOrEqual(0);
    expect(model.score).toBeLessThanOrEqual(100);
    expect(typeof model.benchmark).toBe("string");
    expect(model.benchmark.length).toBeGreaterThan(0);
    expect(Array.isArray(model.topActions)).toBe(true);
    expect(model.topActions.every((a) => typeof a === "string")).toBe(true);
    expect(typeof model.readyToLaunch).toBe("boolean");
  });

  it("overallScore is a number between 0 and 100", async () => {
    mockClaude({
      models: [
        {
          name: "paid_membership",
          score: 85,
          benchmark: "500+ members + 8+ weeks active",
          topActions: ["x"],
          readyToLaunch: true,
        },
      ],
      overallScore: 72,
      summary: "Ready.",
    });

    const { result } = await assessMonetizationReadiness(strongInput);

    expect(typeof result.overallScore).toBe("number");
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);
  });

  it("summary is a non-empty string", async () => {
    mockClaude({
      models: [
        {
          name: "paid_membership",
          score: 85,
          benchmark: "500+ members + 8+ weeks active",
          topActions: ["x"],
          readyToLaunch: true,
        },
      ],
      overallScore: 85,
      summary: "Community has the scale and engagement for paid membership.",
    });

    const { result } = await assessMonetizationReadiness(strongInput);

    expect(typeof result.summary).toBe("string");
    expect(result.summary.length).toBeGreaterThan(0);
  });

  it("derives readyToLaunch from score >= 70, overriding any value the LLM returned", async () => {
    mockClaude({
      models: [
        {
          name: "paid_membership",
          score: 40,
          benchmark: "500+ members + 8+ weeks active",
          topActions: ["x"],
          readyToLaunch: true,
        },
      ],
      overallScore: 40,
      summary: "Below threshold despite optimistic LLM flag.",
    });

    const { result } = await assessMonetizationReadiness(tinyInput);
    expect(result.models[0].readyToLaunch).toBe(false);
  });

  it("returns modelUsed and tokensUsed metadata", async () => {
    mockClaude({
      models: [
        {
          name: "paid_membership",
          score: 85,
          benchmark: "500+ members + 8+ weeks active",
          topActions: ["x"],
          readyToLaunch: true,
        },
      ],
      overallScore: 85,
      summary: "Ready.",
    });

    const out = await assessMonetizationReadiness(strongInput);

    expect(out.modelUsed).toBe("claude-sonnet-4-20250514");
    expect(out.tokensUsed).toBe(1500);
  });
});
