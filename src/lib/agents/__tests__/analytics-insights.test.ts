import { CLAUDE_MODEL } from "@/lib/model";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateAnalyticsInsights } from "../analytics-insights";
import type {
  AnalyticsInsightsInput,
  AnalyticsInsightsResult,
  ContentRanking,
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

const resultFixture: AnalyticsInsightsResult = {
  insights: ["Twitter drives the most reach", "Reddit converts best"],
  recommendations: [
    "Double down on Twitter threads",
    "Post Reddit on weekends",
  ],
  audienceUpdates: {
    confidenceLevel: "data_informed",
    newPatterns: ["Engages most in the evening"],
  },
};

const baseInput: AnalyticsInsightsInput = {
  campaignName: "Build Before You Launch",
  strategySummary: "A pre-launch awareness campaign.",
  platformBreakdown: [
    {
      platform: "twitter",
      reach: 5000,
      impressions: 8000,
      engagements: 400,
      engagementRate: 5,
    },
  ],
  pillarBreakdown: [
    {
      pillar: "Build in Public",
      totalReach: 3000,
      totalEngagements: 250,
      avgEngagementRate: 4.2,
      contentCount: 6,
    },
  ],
  contentRankings: [
    {
      contentId: "c1",
      title: "Stop building in silence",
      platform: "twitter",
      pillar: "Build in Public",
      reach: 1200,
      engagements: 100,
      engagementRate: 8.3,
    },
  ],
};

function mockResponse(payload: unknown, input = 400, output = 600) {
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

describe("generateAnalyticsInsights", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the parsed insights result", async () => {
    mockCreate.mockResolvedValue(mockResponse(resultFixture));

    const { result } = await generateAnalyticsInsights(baseInput);
    expect(result).toEqual(resultFixture);
  });

  it("reports model and total tokens", async () => {
    mockCreate.mockResolvedValue(mockResponse(resultFixture, 400, 600));

    const { modelUsed, tokensUsed } =
      await generateAnalyticsInsights(baseInput);
    expect(modelUsed).toBe(CLAUDE_MODEL);
    expect(tokensUsed).toBe(1000);
  });

  it("includes campaign, platform, and pillar data in the prompt", async () => {
    mockCreate.mockResolvedValue(mockResponse(resultFixture));

    await generateAnalyticsInsights(baseInput);
    const prompt = mockCreate.mock.calls[0][0].messages[0].content as string;
    expect(prompt).toContain("Build Before You Launch");
    expect(prompt).toContain("twitter");
    expect(prompt).toContain("Build in Public");
  });

  it("only includes the top 10 ranked content items", async () => {
    const rankings: ContentRanking[] = Array.from({ length: 15 }, (_, i) => ({
      contentId: `c${i}`,
      title: `Title ${i}`,
      platform: "twitter",
      pillar: "Build in Public",
      reach: 100,
      engagements: 10,
      engagementRate: 10,
    }));
    mockCreate.mockResolvedValue(mockResponse(resultFixture));

    await generateAnalyticsInsights({
      ...baseInput,
      contentRankings: rankings,
    });
    const prompt = mockCreate.mock.calls[0][0].messages[0].content as string;
    expect(prompt).toContain("Title 9");
    expect(prompt).not.toContain("Title 10");
  });

  it("renders fallback labels for null title and pillar", async () => {
    mockCreate.mockResolvedValue(mockResponse(resultFixture));

    await generateAnalyticsInsights({
      ...baseInput,
      contentRankings: [
        {
          contentId: "c1",
          title: null,
          platform: "reddit",
          pillar: null,
          reach: 50,
          engagements: 5,
          engagementRate: 10,
        },
      ],
    });
    const prompt = mockCreate.mock.calls[0][0].messages[0].content as string;
    expect(prompt).toContain("Untitled");
    expect(prompt).toContain("reddit/none");
  });

  it("throws when Claude returns non-JSON", async () => {
    const restore = stubImmediateTimeout();
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "not json" }],
      usage: { input_tokens: 1, output_tokens: 1 },
    } as Awaited<ReturnType<typeof anthropic.messages.create>>);

    await expect(generateAnalyticsInsights(baseInput)).rejects.toThrow();
    restore();
  });

  it("throws when the content block is not text", async () => {
    const restore = stubImmediateTimeout();
    mockCreate.mockResolvedValue({
      content: [{ type: "tool_use", id: "t", name: "x", input: {} }],
      usage: { input_tokens: 1, output_tokens: 1 },
    } as unknown as Awaited<ReturnType<typeof anthropic.messages.create>>);

    await expect(generateAnalyticsInsights(baseInput)).rejects.toThrow();
    restore();
  });

  it("treats missing usage token counts as zero", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify(resultFixture) }],
      usage: {},
    } as unknown as Awaited<ReturnType<typeof anthropic.messages.create>>);

    const { tokensUsed } = await generateAnalyticsInsights(baseInput);
    expect(tokensUsed).toBe(0);
  });
});
