import { CLAUDE_MODEL } from "@/lib/model";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateCampaignPlan } from "../campaign-generator";
import { audienceProfileFixture } from "../__fixtures__/audience";
import { quizFixture } from "../__fixtures__/quiz";
import type {
  CampaignDuration,
  CampaignGeneratorOutput,
  CampaignPlatform,
} from "@/types";

vi.mock("@/lib/claude", () => ({
  anthropic: {
    messages: {
      create: vi.fn(),
    },
  },
}));

import { anthropic } from "@/lib/claude";
const mockCreate = vi.mocked(anthropic.messages.create);

const outputFixture: CampaignGeneratorOutput = {
  strategySummary:
    "A four-week build-in-public campaign across three platforms.",
  contentPillars: [
    {
      theme: "Build in Public",
      description: "Transparent updates",
      sampleTopics: ["Week 1", "Mistakes", "Revenue"],
      targetedPainPoint: "Feels inauthentic",
    },
  ],
  contentPlan: [
    {
      platform: "twitter",
      contentType: "tip",
      pillar: "Build in Public",
      title: "Stop building in silence",
      scheduledDay: 1,
    },
    {
      platform: "linkedin",
      contentType: "story",
      pillar: "Build in Public",
      title: "How I found my first users",
      scheduledDay: 4,
    },
  ],
};

const baseInput = {
  profile: audienceProfileFixture,
  quiz: quizFixture,
  name: "Build Before You Launch",
  goal: "build-awareness" as const,
  topic: "pre-launch community building",
  platforms: ["twitter", "linkedin"] as CampaignPlatform[],
  duration: "1-month" as CampaignDuration,
  frequencyConfig: { twitter: 5, linkedin: 3 },
};

function mockResponse(payload: unknown, input = 200, output = 800) {
  return {
    content: [{ type: "text", text: JSON.stringify(payload) }],
    usage: { input_tokens: input, output_tokens: output },
  } as Awaited<ReturnType<typeof anthropic.messages.create>>;
}

function stubImmediateTimeout() {
  const original = globalThis.setTimeout;
  vi.stubGlobal("setTimeout", (fn: (...args: unknown[]) => void) => {
    Promise.resolve().then(() => fn());
    return 0 as unknown as ReturnType<typeof setTimeout>;
  });
  return () => vi.stubGlobal("setTimeout", original);
}

describe("generateCampaignPlan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the parsed campaign output", async () => {
    mockCreate.mockResolvedValue(mockResponse(outputFixture));

    const result = await generateCampaignPlan(baseInput);

    expect(result.output.strategySummary).toBe(outputFixture.strategySummary);
    expect(result.output.contentPillars).toEqual(outputFixture.contentPillars);
    expect(result.output.contentPlan).toEqual(outputFixture.contentPlan);
  });

  it("reports the model and total tokens used", async () => {
    mockCreate.mockResolvedValue(mockResponse(outputFixture, 200, 800));

    const result = await generateCampaignPlan(baseInput);

    expect(result.modelUsed).toBe(CLAUDE_MODEL);
    expect(result.tokensUsed).toBe(1000);
  });

  it("maps each duration to the correct number of weeks/days in the prompt", async () => {
    const cases: { duration: CampaignDuration; days: number }[] = [
      { duration: "1-week", days: 7 },
      { duration: "2-weeks", days: 14 },
      { duration: "1-month", days: 28 },
      { duration: "ongoing", days: 84 },
    ];

    for (const { duration, days } of cases) {
      mockCreate.mockResolvedValue(mockResponse(outputFixture));
      await generateCampaignPlan({ ...baseInput, duration });
      const prompt = mockCreate.mock.calls.at(-1)![0].messages[0]
        .content as string;
      expect(prompt).toContain(`(${days} days)`);
    }
  });

  it("defaults missing platform frequency to 1x/week", async () => {
    mockCreate.mockResolvedValue(mockResponse(outputFixture));

    await generateCampaignPlan({
      ...baseInput,
      platforms: ["twitter", "reddit"],
      frequencyConfig: { twitter: 5 }, // reddit omitted
    });

    const prompt = mockCreate.mock.calls[0][0].messages[0].content as string;
    expect(prompt).toContain("reddit: 1x/week");
    expect(prompt).toContain("twitter: 5x/week");
  });

  it("throws when Claude returns non-JSON text", async () => {
    const restore = stubImmediateTimeout();
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "not valid json" }],
      usage: { input_tokens: 1, output_tokens: 1 },
    } as Awaited<ReturnType<typeof anthropic.messages.create>>);

    await expect(generateCampaignPlan(baseInput)).rejects.toThrow();
    restore();
  });

  it("throws when the content block is not text", async () => {
    const restore = stubImmediateTimeout();
    mockCreate.mockResolvedValue({
      content: [{ type: "tool_use", id: "t", name: "x", input: {} }],
      usage: { input_tokens: 1, output_tokens: 1 },
    } as unknown as Awaited<ReturnType<typeof anthropic.messages.create>>);

    await expect(generateCampaignPlan(baseInput)).rejects.toThrow();
    restore();
  });

  it("treats missing usage token counts as zero", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify(outputFixture) }],
      usage: {},
    } as unknown as Awaited<ReturnType<typeof anthropic.messages.create>>);

    const { tokensUsed } = await generateCampaignPlan(baseInput);
    expect(tokensUsed).toBe(0);
  });
});
