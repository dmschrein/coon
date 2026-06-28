import { CLAUDE_MODEL } from "@/lib/model";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { scoreContent } from "../content-scoring";

vi.mock("@/lib/claude", () => ({
  anthropic: {
    messages: {
      create: vi.fn(),
    },
  },
}));

import { anthropic } from "@/lib/claude";
const mockCreate = vi.mocked(anthropic.messages.create);

function mockResponse(payload: unknown, input = 300, output = 200) {
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

const baseInput = {
  platform: "twitter" as const,
  contentData: { text: "tweet" },
  title: "A Tweet",
  body: "Here is the body.",
  strategySummary: "Drive engagement.",
  audienceSummary: "Founders.",
};

const validScores = {
  engagementPotential: 8,
  brandVoiceAlignment: 7,
  platformFit: 9,
  feedback: ["Strong hook", "Clear CTA"],
  suggestions: ["Add an emoji"],
};

describe("scoreContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns scores and a computed overallScore", async () => {
    mockCreate.mockResolvedValue(mockResponse(validScores));

    const { result } = await scoreContent(baseInput);

    expect(result.engagementPotential).toBe(8);
    expect(result.brandVoiceAlignment).toBe(7);
    expect(result.platformFit).toBe(9);
    // round((8+7+9)/3) = 8
    expect(result.overallScore).toBe(8);
    expect(result.feedback).toEqual(validScores.feedback);
    expect(result.suggestions).toEqual(validScores.suggestions);
    expect(typeof result.scoredAt).toBe("string");
  });

  it("reports model and total tokens", async () => {
    mockCreate.mockResolvedValue(mockResponse(validScores, 300, 200));

    const { modelUsed, tokensUsed } = await scoreContent(baseInput);
    expect(modelUsed).toBe(CLAUDE_MODEL);
    expect(tokensUsed).toBe(500);
  });

  it("clamps out-of-range scores into [1,10] and rounds decimals", async () => {
    mockCreate.mockResolvedValue(
      mockResponse({
        ...validScores,
        engagementPotential: 99,
        brandVoiceAlignment: -5,
        platformFit: 6.7,
      })
    );

    const { result } = await scoreContent(baseInput);
    expect(result.engagementPotential).toBe(10);
    expect(result.brandVoiceAlignment).toBe(1);
    expect(result.platformFit).toBe(7);
    // round((10+1+7)/3) = 6
    expect(result.overallScore).toBe(6);
  });

  it("defaults feedback and suggestions to empty arrays when missing", async () => {
    mockCreate.mockResolvedValue(
      mockResponse({
        engagementPotential: 5,
        brandVoiceAlignment: 5,
        platformFit: 5,
      })
    );

    const { result } = await scoreContent(baseInput);
    expect(result.feedback).toEqual([]);
    expect(result.suggestions).toEqual([]);
  });

  it("falls back to stringified contentData when body is null", async () => {
    mockCreate.mockResolvedValue(mockResponse(validScores));

    await scoreContent({
      ...baseInput,
      body: null,
      contentData: { text: "data-only-content" },
    });
    const prompt = mockCreate.mock.calls[0][0].messages[0].content as string;
    expect(prompt).toContain("data-only-content");
  });

  it("omits strategy/audience lines and uses Untitled when nulls supplied", async () => {
    mockCreate.mockResolvedValue(mockResponse(validScores));

    await scoreContent({
      ...baseInput,
      title: null,
      strategySummary: null,
      audienceSummary: null,
    });
    const prompt = mockCreate.mock.calls[0][0].messages[0].content as string;
    expect(prompt).toContain("Untitled");
    expect(prompt).not.toContain("Campaign Strategy");
    expect(prompt).not.toContain("Target Audience");
  });

  it("throws when Claude returns non-JSON", async () => {
    const restore = stubImmediateTimeout();
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "garbage" }],
      usage: { input_tokens: 1, output_tokens: 1 },
    } as Awaited<ReturnType<typeof anthropic.messages.create>>);

    await expect(scoreContent(baseInput)).rejects.toThrow();
    restore();
  });

  it("throws when the content block is not text", async () => {
    const restore = stubImmediateTimeout();
    mockCreate.mockResolvedValue({
      content: [{ type: "tool_use", id: "t", name: "x", input: {} }],
      usage: { input_tokens: 1, output_tokens: 1 },
    } as unknown as Awaited<ReturnType<typeof anthropic.messages.create>>);

    await expect(scoreContent(baseInput)).rejects.toThrow();
    restore();
  });
});
