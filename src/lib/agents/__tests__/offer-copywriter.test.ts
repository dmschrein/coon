import { describe, it, expect, vi, beforeEach } from "vitest";
import { writeTierCopy } from "../offer-copywriter";
import type { TierCopyInput, TierCopyOutput } from "../offer-copywriter";

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

type CreateResult = Awaited<ReturnType<typeof anthropic.messages.create>>;

const baseInput: TierCopyInput = {
  audienceSummary:
    "Solo founders building B2B SaaS who want to launch and grow before quitting their day job.",
  communityName: "Indie Builders",
  priceCents: 2900,
  billingCycle: "monthly",
  tierGoal: "Premium tier for serious builders ready to launch in 90 days",
};

const goodOutput: TierCopyOutput = {
  name: "Builder Pro",
  tagline: "Launch your SaaS in 90 days with weekly accountability",
  description:
    "A premium tier for solo founders who are ready to stop tinkering and ship a real product to paying customers.",
  benefits: [
    "Launch your first revenue-generating SaaS in under 90 days",
    "Master the launch playbook used by 200+ indie founders",
    "Build accountability with a weekly cohort that ships together",
    "Unlock direct feedback from operators with $1M+ ARR",
    "Earn your first paying customer with our outreach scripts",
    "Develop product-market fit faster with monthly teardowns",
  ],
};

function mockClaude(payload: TierCopyOutput) {
  mockCreate.mockResolvedValue({
    content: [{ type: "text", text: JSON.stringify(payload) }],
    usage: { input_tokens: 400, output_tokens: 800 },
  } as CreateResult);
}

describe("writeTierCopy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns between 5 and 8 benefits (inclusive)", async () => {
    mockClaude(goodOutput);

    const { result } = await writeTierCopy(baseInput);

    expect(result.benefits.length).toBeGreaterThanOrEqual(5);
    expect(result.benefits.length).toBeLessThanOrEqual(8);
  });

  it("no benefit starts with the word 'Access'", async () => {
    mockClaude(goodOutput);

    const { result } = await writeTierCopy(baseInput);

    for (const benefit of result.benefits) {
      expect(benefit.toLowerCase()).not.toMatch(/^access\b/);
    }
  });

  it("no benefit starts with 'Get access'", async () => {
    mockClaude(goodOutput);

    const { result } = await writeTierCopy(baseInput);

    for (const benefit of result.benefits) {
      expect(benefit.toLowerCase()).not.toMatch(/^get access\b/);
    }
  });

  it("benefits contain action verbs indicating outcomes", async () => {
    mockClaude(goodOutput);

    const { result } = await writeTierCopy(baseInput);

    const actionVerbs = [
      "achieve",
      "master",
      "build",
      "grow",
      "create",
      "earn",
      "launch",
      "unlock",
      "develop",
    ];
    const hasActionVerb = result.benefits.some((b) =>
      actionVerbs.some((v) => b.toLowerCase().includes(v))
    );
    expect(hasActionVerb).toBe(true);
  });

  it("output contains name, tagline, description, and benefits fields", async () => {
    mockClaude(goodOutput);

    const { result } = await writeTierCopy(baseInput);

    expect(result).toHaveProperty("name");
    expect(result).toHaveProperty("tagline");
    expect(result).toHaveProperty("description");
    expect(result).toHaveProperty("benefits");
    expect(typeof result.name).toBe("string");
    expect(typeof result.tagline).toBe("string");
    expect(typeof result.description).toBe("string");
    expect(Array.isArray(result.benefits)).toBe(true);
  });
});
