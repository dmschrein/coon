import { CLAUDE_MODEL } from "@/lib/model";
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateContentPiece,
  type ContentBrief,
  type ContentPieceContext,
} from "../content-piece-generator";
import { audienceProfileFixture } from "../__fixtures__/audience";
import type { ContentPieceOutput } from "@/lib/validations/content-piece";

vi.mock("@/lib/claude", () => ({
  anthropic: {
    messages: {
      create: vi.fn(),
    },
  },
}));

import { anthropic } from "@/lib/claude";
const mockCreate = vi.mocked(anthropic.messages.create);

const outputFixture: ContentPieceOutput = {
  body: "Stop building in silence. Here's how to start your community.",
  hashtags: ["#buildinpublic", "#saas"],
  mediaSuggestions: [{ type: "image", description: "A founder at a laptop." }],
  confidenceScore: 0.85,
  targetCommunity: "Indie SaaS founders",
};

const context: ContentPieceContext = {
  audienceProfile: audienceProfileFixture,
  strategySummary: "Build pre-launch awareness.",
  contentPillars: [
    {
      theme: "Build in Public",
      description: "Transparent updates",
      sampleTopics: ["Week 1", "Mistakes"],
      targetedPainPoint: "Feels inauthentic",
    },
  ],
  campaignGoal: "build-awareness",
  campaignTopic: "pre-launch community building",
};

const brief: ContentBrief = {
  platform: "reddit",
  contentType: "story",
  pillar: "Build in Public",
  title: "How I built my first community",
  targetCommunity: "r/startups",
};

function mockResponse(payload: unknown, input = 300, output = 400) {
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

describe("generateContentPiece", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the validated content piece output", async () => {
    mockCreate.mockResolvedValue(mockResponse(outputFixture));

    const { output } = await generateContentPiece(brief, context);
    expect(output).toEqual(outputFixture);
  });

  it("reports model and total tokens", async () => {
    mockCreate.mockResolvedValue(mockResponse(outputFixture, 300, 400));

    const { modelUsed, tokensUsed } = await generateContentPiece(
      brief,
      context
    );
    expect(modelUsed).toBe(CLAUDE_MODEL);
    expect(tokensUsed).toBe(700);
  });

  it("uses platform-specific instructions for known platforms", async () => {
    mockCreate.mockResolvedValue(mockResponse(outputFixture));

    await generateContentPiece(brief, context);
    const prompt = mockCreate.mock.calls[0][0].messages[0].content as string;
    expect(prompt).toContain("Reddit:");
  });

  it("falls back to generic guidance for unknown platforms", async () => {
    mockCreate.mockResolvedValue(mockResponse(outputFixture));

    await generateContentPiece(
      { ...brief, platform: "hackernews" as ContentBrief["platform"] },
      context
    );
    const prompt = mockCreate.mock.calls[0][0].messages[0].content as string;
    expect(prompt).toContain("Write native content for hackernews");
  });

  it("includes pillar detail when the brief pillar matches a known pillar", async () => {
    mockCreate.mockResolvedValue(mockResponse(outputFixture));

    await generateContentPiece(brief, context);
    const prompt = mockCreate.mock.calls[0][0].messages[0].content as string;
    expect(prompt).toContain("Targeted Pain Point: Feels inauthentic");
  });

  it("omits pillar detail when the brief pillar has no match", async () => {
    mockCreate.mockResolvedValue(mockResponse(outputFixture));

    await generateContentPiece({ ...brief, pillar: "Nonexistent" }, context);
    const prompt = mockCreate.mock.calls[0][0].messages[0].content as string;
    expect(prompt).not.toContain("Targeted Pain Point:");
  });

  it("defaults target community to 'general' when omitted", async () => {
    mockCreate.mockResolvedValue(mockResponse(outputFixture));

    const noCommunity: ContentBrief = { ...brief, targetCommunity: undefined };
    await generateContentPiece(noCommunity, context);
    const prompt = mockCreate.mock.calls[0][0].messages[0].content as string;
    expect(prompt).toContain("Target Community: general");
  });

  it("throws when output fails Zod validation (confidenceScore out of range)", async () => {
    const restore = stubImmediateTimeout();
    mockCreate.mockResolvedValue(
      mockResponse({ ...outputFixture, confidenceScore: 5 })
    );

    await expect(generateContentPiece(brief, context)).rejects.toThrow();
    restore();
  });

  it("throws when Claude returns non-JSON", async () => {
    const restore = stubImmediateTimeout();
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "definitely not json" }],
      usage: { input_tokens: 1, output_tokens: 1 },
    } as Awaited<ReturnType<typeof anthropic.messages.create>>);

    await expect(generateContentPiece(brief, context)).rejects.toThrow();
    restore();
  });

  it("throws when the content block is not text", async () => {
    const restore = stubImmediateTimeout();
    mockCreate.mockResolvedValue({
      content: [{ type: "tool_use", id: "t", name: "x", input: {} }],
      usage: { input_tokens: 1, output_tokens: 1 },
    } as unknown as Awaited<ReturnType<typeof anthropic.messages.create>>);

    await expect(generateContentPiece(brief, context)).rejects.toThrow();
    restore();
  });

  it("treats missing usage token counts as zero", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify(outputFixture) }],
      usage: {},
    } as unknown as Awaited<ReturnType<typeof anthropic.messages.create>>);

    const { tokensUsed } = await generateContentPiece(brief, context);
    expect(tokensUsed).toBe(0);
  });
});
