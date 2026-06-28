import { CLAUDE_MODEL } from "@/lib/model";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { optimizeContent } from "../seo-optimization";
import type {
  HashtagAnalysis,
  PostingTimeRecommendation,
  SeoAnalysis,
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

const postingTime: PostingTimeRecommendation = {
  bestTime: "18:00",
  timezone: "America/New_York",
  reasoning: "Peak engagement window for this audience.",
  alternativeTimes: ["12:00", "21:00"],
};

const hashtags: HashtagAnalysis = {
  current: ["#startup"],
  suggested: ["#buildinpublic", "#saas"],
  trending: ["#founderlife"],
  removed: [],
  reasoning: "Mix of niche and trending tags.",
};

const seo: SeoAnalysis = {
  keywordDensity: { startup: 0.02 },
  missingKeywords: ["pre-launch"],
  metaDescriptionScore: 8,
  headingStructureScore: 7,
  readabilityScore: 9,
  suggestions: ["Add a meta description"],
};

function mockResponse(payload: unknown, input = 300, output = 500) {
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
  platform: "instagram" as const,
  contentData: { caption: "hi" },
  title: "My Post",
  body: "Here is the body of the post.",
  strategySummary: "Build awareness.",
  audienceSummary: "Solo founders.",
};

describe("optimizeContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns posting time and an ISO optimizedAt timestamp", async () => {
    mockCreate.mockResolvedValue(mockResponse({ postingTime, hashtags }));

    const { result } = await optimizeContent(baseInput);

    expect(result.postingTime).toEqual(postingTime);
    expect(typeof result.optimizedAt).toBe("string");
    expect(() => new Date(result.optimizedAt).toISOString()).not.toThrow();
  });

  it("reports model and tokens used", async () => {
    mockCreate.mockResolvedValue(mockResponse({ postingTime }, 300, 500));

    const { modelUsed, tokensUsed } = await optimizeContent(baseInput);

    expect(modelUsed).toBe(CLAUDE_MODEL);
    expect(tokensUsed).toBe(800);
  });

  it("includes hashtags when present in the response", async () => {
    mockCreate.mockResolvedValue(mockResponse({ postingTime, hashtags }));

    const { result } = await optimizeContent(baseInput);
    expect(result.hashtags).toEqual(hashtags);
    expect(result.seo).toBeUndefined();
  });

  it("includes seo block for blog platform", async () => {
    mockCreate.mockResolvedValue(mockResponse({ postingTime, seo }));

    const { result } = await optimizeContent({
      ...baseInput,
      platform: "blog",
    });
    expect(result.seo).toEqual(seo);
  });

  it("requests hashtag guidance for hashtag platforms", async () => {
    mockCreate.mockResolvedValue(mockResponse({ postingTime, hashtags }));

    await optimizeContent({ ...baseInput, platform: "twitter" });
    const prompt = mockCreate.mock.calls[0][0].messages[0].content as string;
    expect(prompt).toContain('"hashtags"');
  });

  it("omits hashtag and seo guidance for non-hashtag, non-blog platforms", async () => {
    mockCreate.mockResolvedValue(mockResponse({ postingTime }));

    await optimizeContent({ ...baseInput, platform: "discord" });
    const prompt = mockCreate.mock.calls[0][0].messages[0].content as string;
    expect(prompt).not.toContain('"hashtags"');
    expect(prompt).not.toContain('"seo"');
  });

  it("falls back to stringified contentData when body is null", async () => {
    mockCreate.mockResolvedValue(mockResponse({ postingTime }));

    await optimizeContent({
      ...baseInput,
      body: null,
      contentData: { caption: "from-content-data" },
    });
    const prompt = mockCreate.mock.calls[0][0].messages[0].content as string;
    expect(prompt).toContain("from-content-data");
  });

  it("uses 'Untitled' and omits strategy/audience lines when those are null", async () => {
    mockCreate.mockResolvedValue(mockResponse({ postingTime }));

    await optimizeContent({
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
      content: [{ type: "text", text: "no json here" }],
      usage: { input_tokens: 1, output_tokens: 1 },
    } as Awaited<ReturnType<typeof anthropic.messages.create>>);

    await expect(optimizeContent(baseInput)).rejects.toThrow();
    restore();
  });

  it("throws when the content block is not text", async () => {
    const restore = stubImmediateTimeout();
    mockCreate.mockResolvedValue({
      content: [{ type: "tool_use", id: "t", name: "x", input: {} }],
      usage: { input_tokens: 1, output_tokens: 1 },
    } as unknown as Awaited<ReturnType<typeof anthropic.messages.create>>);

    await expect(optimizeContent(baseInput)).rejects.toThrow();
    restore();
  });
});
