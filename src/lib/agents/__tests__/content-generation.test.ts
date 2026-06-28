import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateContent } from "../content-generation";
import { audienceProfileFixture } from "../__fixtures__/audience";
import { quizFixture } from "../__fixtures__/quiz";
import type { ContentStrategy, GeneratedContent, QuizResponse } from "@/types";

vi.mock("@/lib/claude", () => ({
  anthropic: {
    messages: {
      create: vi.fn(),
    },
  },
}));

import { anthropic } from "@/lib/claude";
const mockCreate = vi.mocked(anthropic.messages.create);

const strategyFixture: ContentStrategy = {
  pillars: [
    {
      theme: "Build in Public",
      description: "Share the journey transparently",
      sampleTopics: ["Week 1 update", "Biggest mistake", "Revenue report"],
      targetedPainPoint: "Feels inauthentic posting marketing content",
    },
    {
      theme: "Audience Growth",
      description: "Tactical community-building tips",
      sampleTopics: ["Find your first 100", "Validate with conversations"],
      targetedPainPoint: "No audience at launch time",
    },
  ],
  voiceTone: "Direct, empowering, founder-to-founder.",
  contentMix: { twitter: 50, linkedin: 30, reddit: 20 },
};

const draftsFixture: GeneratedContent[] = [
  {
    platform: "twitter",
    contentType: "tip",
    pillar: "Build in Public",
    draft: {
      headline: undefined,
      body: "Stop building in silence. Share your journey.",
      hashtags: ["#buildinpublic"],
      cta: "What are you building?",
    },
  },
  {
    platform: "linkedin",
    contentType: "story",
    pillar: "Audience Growth",
    draft: {
      headline: "How I found my first 100 users",
      body: "Here is the story of building an audience before launch.",
      hashtags: undefined,
      cta: undefined,
    },
  },
];

function mockResponse(payload: unknown, input = 100, output = 200) {
  return {
    content: [{ type: "text", text: JSON.stringify(payload) }],
    usage: { input_tokens: input, output_tokens: output },
  } as Awaited<ReturnType<typeof anthropic.messages.create>>;
}

/** Make withRetry's setTimeout resolve immediately so failure paths are fast. */
function stubImmediateTimeout() {
  const original = globalThis.setTimeout;
  vi.stubGlobal("setTimeout", (fn: (...args: unknown[]) => void) => {
    Promise.resolve().then(() => fn());
    return 0 as unknown as ReturnType<typeof setTimeout>;
  });
  return () => vi.stubGlobal("setTimeout", original);
}

describe("generateContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns validated strategy and drafts on the success path", async () => {
    mockCreate
      .mockResolvedValueOnce(mockResponse(strategyFixture, 100, 200))
      .mockResolvedValueOnce(mockResponse(draftsFixture, 300, 400));

    const result = await generateContent(audienceProfileFixture, quizFixture);

    expect(result.strategy).toEqual(strategyFixture);
    expect(result.drafts).toEqual(draftsFixture);
    expect(result.drafts).toHaveLength(2);
  });

  it("sums tokens across the strategy and drafts calls", async () => {
    mockCreate
      .mockResolvedValueOnce(mockResponse(strategyFixture, 100, 200))
      .mockResolvedValueOnce(mockResponse(draftsFixture, 300, 400));

    const result = await generateContent(audienceProfileFixture, quizFixture);

    // 100+200 (strategy) + 300+400 (drafts)
    expect(result.tokensUsed).toBe(1000);
  });

  it("reports the model used for both steps", async () => {
    mockCreate
      .mockResolvedValueOnce(mockResponse(strategyFixture))
      .mockResolvedValueOnce(mockResponse(draftsFixture));

    const result = await generateContent(audienceProfileFixture, quizFixture);
    expect(result.modelUsed).toContain("strategy");
    expect(result.modelUsed).toContain("drafts");
  });

  it("requests 10 pieces for <= 2 platforms", async () => {
    const quiz: QuizResponse = {
      ...quizFixture,
      preferredPlatforms: ["twitter", "linkedin"],
    };
    mockCreate
      .mockResolvedValueOnce(mockResponse(strategyFixture))
      .mockResolvedValueOnce(mockResponse(draftsFixture));

    await generateContent(audienceProfileFixture, quiz);

    const draftsPrompt = mockCreate.mock.calls[1][0].messages[0]
      .content as string;
    expect(draftsPrompt).toContain("generate 10 content pieces");
  });

  it("requests 15 pieces for 3-4 platforms", async () => {
    const quiz: QuizResponse = {
      ...quizFixture,
      preferredPlatforms: ["twitter", "linkedin", "reddit", "discord"],
    };
    mockCreate
      .mockResolvedValueOnce(mockResponse(strategyFixture))
      .mockResolvedValueOnce(mockResponse(draftsFixture));

    await generateContent(audienceProfileFixture, quiz);

    const draftsPrompt = mockCreate.mock.calls[1][0].messages[0]
      .content as string;
    expect(draftsPrompt).toContain("generate 15 content pieces");
  });

  it("requests 20 pieces for > 4 platforms", async () => {
    const quiz: QuizResponse = {
      ...quizFixture,
      preferredPlatforms: [
        "twitter",
        "linkedin",
        "reddit",
        "discord",
        "youtube",
      ],
    };
    mockCreate
      .mockResolvedValueOnce(mockResponse(strategyFixture))
      .mockResolvedValueOnce(mockResponse(draftsFixture));

    await generateContent(audienceProfileFixture, quiz);

    const draftsPrompt = mockCreate.mock.calls[1][0].messages[0]
      .content as string;
    expect(draftsPrompt).toContain("generate 20 content pieces");
  });

  it("extracts JSON wrapped in markdown code fences", async () => {
    mockCreate
      .mockResolvedValueOnce({
        content: [
          {
            type: "text",
            text: `\`\`\`json\n${JSON.stringify(strategyFixture)}\n\`\`\``,
          },
        ],
        usage: { input_tokens: 10, output_tokens: 20 },
      } as Awaited<ReturnType<typeof anthropic.messages.create>>)
      .mockResolvedValueOnce(mockResponse(draftsFixture));

    const result = await generateContent(audienceProfileFixture, quizFixture);
    expect(result.strategy).toEqual(strategyFixture);
  });

  it("throws when the strategy response is not JSON", async () => {
    const restore = stubImmediateTimeout();
    mockCreate.mockResolvedValue(
      mockResponse("not json at all" as unknown as object)
    );
    // mockResponse stringifies — produce raw non-JSON text instead.
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "totally not json" }],
      usage: { input_tokens: 1, output_tokens: 1 },
    } as Awaited<ReturnType<typeof anthropic.messages.create>>);

    await expect(
      generateContent(audienceProfileFixture, quizFixture)
    ).rejects.toThrow();
    restore();
  });

  it("throws when the strategy fails Zod validation (empty pillars)", async () => {
    const restore = stubImmediateTimeout();
    mockCreate.mockResolvedValue(
      mockResponse({ ...strategyFixture, pillars: [] })
    );

    await expect(
      generateContent(audienceProfileFixture, quizFixture)
    ).rejects.toThrow();
    restore();
  });

  it("throws when a draft fails Zod validation (empty body)", async () => {
    const restore = stubImmediateTimeout();
    mockCreate
      .mockResolvedValueOnce(mockResponse(strategyFixture))
      .mockResolvedValueOnce(
        mockResponse([
          {
            platform: "twitter",
            contentType: "tip",
            pillar: "Build in Public",
            draft: { body: "" },
          },
        ])
      );

    await expect(
      generateContent(audienceProfileFixture, quizFixture)
    ).rejects.toThrow();
    restore();
  });

  it("throws when the strategy content block is not text", async () => {
    const restore = stubImmediateTimeout();
    mockCreate.mockResolvedValue({
      content: [{ type: "tool_use", id: "t", name: "x", input: {} }],
      usage: { input_tokens: 1, output_tokens: 1 },
    } as unknown as Awaited<ReturnType<typeof anthropic.messages.create>>);

    await expect(
      generateContent(audienceProfileFixture, quizFixture)
    ).rejects.toThrow();
    restore();
  });

  it("throws when the drafts content block is not text", async () => {
    const restore = stubImmediateTimeout();
    mockCreate
      .mockResolvedValueOnce(mockResponse(strategyFixture))
      .mockResolvedValue({
        content: [{ type: "tool_use", id: "t", name: "x", input: {} }],
        usage: { input_tokens: 1, output_tokens: 1 },
      } as unknown as Awaited<ReturnType<typeof anthropic.messages.create>>);

    await expect(
      generateContent(audienceProfileFixture, quizFixture)
    ).rejects.toThrow();
    restore();
  });

  it("treats missing usage token counts as zero across both steps", async () => {
    mockCreate
      .mockResolvedValueOnce({
        content: [{ type: "text", text: JSON.stringify(strategyFixture) }],
        usage: {},
      } as unknown as Awaited<ReturnType<typeof anthropic.messages.create>>)
      .mockResolvedValueOnce({
        content: [{ type: "text", text: JSON.stringify(draftsFixture) }],
        usage: {},
      } as unknown as Awaited<ReturnType<typeof anthropic.messages.create>>);

    const result = await generateContent(audienceProfileFixture, quizFixture);
    expect(result.tokensUsed).toBe(0);
  });
});
