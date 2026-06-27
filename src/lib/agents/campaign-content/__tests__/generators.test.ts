import { CLAUDE_MODEL } from "@/lib/model";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the Claude client + DB before importing generators.
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
import { generateBlogContent } from "../blog";
import { generateDiscordContent } from "../discord";
import { generateEmailContent } from "../email";
import { generateInstagramContent } from "../instagram";
import { generateLinkedInContent } from "../linkedin";
import { generatePinterestContent } from "../pinterest";
import { generateRedditContent } from "../reddit";
import { generateThreadsContent } from "../threads";
import { generateTikTokContent } from "../tiktok";
import { generateTwitterContent } from "../twitter";
import { generateYouTubeContent } from "../youtube";

import { campaignStrategyFixture } from "../../__fixtures__/campaign";
import { audienceProfileFixture } from "../../__fixtures__/audience";
import { quizFixture } from "../../__fixtures__/quiz";
import {
  blogOutputFixture,
  discordOutputFixture,
  emailOutputFixture,
  instagramOutputFixture,
  linkedinOutputFixture,
  pinterestOutputFixture,
  redditOutputFixture,
  threadsOutputFixture,
  tiktokOutputFixture,
  twitterOutputFixture,
  youtubeOutputFixture,
} from "./content-fixtures";

const mockCreate = vi.mocked(anthropic.messages.create);

type Generator = (
  strategy: typeof campaignStrategyFixture,
  profile: typeof audienceProfileFixture,
  quiz: typeof quizFixture
) => Promise<{ content: unknown; tokensUsed: number }>;

function claudeResponse(payload: unknown, input = 400, output = 600) {
  return {
    content: [{ type: "text", text: JSON.stringify(payload) }],
    usage: { input_tokens: input, output_tokens: output },
  } as Awaited<ReturnType<typeof anthropic.messages.create>>;
}

// Bypass withRetry's exponential backoff so error paths don't wait on real timers.
function patchSetTimeout(): () => void {
  const original = globalThis.setTimeout;
  vi.stubGlobal("setTimeout", (fn: (...args: unknown[]) => void) => {
    Promise.resolve().then(() => fn());
    return 0 as unknown as ReturnType<typeof setTimeout>;
  });
  return () => vi.stubGlobal("setTimeout", original);
}

const call = (gen: Generator) =>
  gen(campaignStrategyFixture, audienceProfileFixture, quizFixture);

interface Case {
  name: string;
  gen: Generator;
  output: unknown;
  maxTokens: number;
  // A field that must appear in the validated content, to confirm round-trip.
  assert: (content: Record<string, unknown>) => void;
  // A required field whose removal must fail Zod validation.
  breakField: string;
  // A substring expected in the interpolated user prompt.
  promptContains: string;
}

const cases: Case[] = [
  {
    name: "blog",
    gen: generateBlogContent as Generator,
    output: blogOutputFixture,
    maxTokens: 8192,
    assert: (c) => expect(c.title).toBe(blogOutputFixture.title),
    breakField: "bodyMarkdown",
    promptContains: campaignStrategyFixture.campaignName,
  },
  {
    name: "discord",
    gen: generateDiscordContent as Generator,
    output: discordOutputFixture,
    maxTokens: 4096,
    assert: (c) =>
      expect((c.engagementPrompts as string[]).length).toBeGreaterThan(0),
    breakField: "introChannelMessage",
    promptContains: "Discord",
  },
  {
    name: "email",
    gen: generateEmailContent as Generator,
    output: emailOutputFixture,
    maxTokens: 4096,
    assert: (c) => expect(c.subjectLine).toBe(emailOutputFixture.subjectLine),
    breakField: "subjectLine",
    promptContains: quizFixture.businessModel,
  },
  {
    name: "instagram",
    gen: generateInstagramContent as Generator,
    output: instagramOutputFixture,
    maxTokens: 4096,
    assert: (c) => expect(c.contentType).toBe("carousel"),
    breakField: "contentType",
    promptContains: "Instagram",
  },
  {
    name: "linkedin",
    gen: generateLinkedInContent as Generator,
    output: linkedinOutputFixture,
    maxTokens: 4096,
    assert: (c) => expect(c.post).toBe(linkedinOutputFixture.post),
    breakField: "post",
    promptContains: "LinkedIn",
  },
  {
    name: "pinterest",
    gen: generatePinterestContent as Generator,
    output: pinterestOutputFixture,
    maxTokens: 4096,
    assert: (c) => expect(c.pinTitle).toBe(pinterestOutputFixture.pinTitle),
    breakField: "pinTitle",
    promptContains: "Pinterest",
  },
  {
    name: "reddit",
    gen: generateRedditContent as Generator,
    output: redditOutputFixture,
    maxTokens: 4096,
    assert: (c) => expect(c.postTitle).toBe(redditOutputFixture.postTitle),
    breakField: "postTitle",
    promptContains: "Reddit",
  },
  {
    name: "threads",
    gen: generateThreadsContent as Generator,
    output: threadsOutputFixture,
    maxTokens: 4096,
    assert: (c) => expect(c.postText).toBe(threadsOutputFixture.postText),
    breakField: "postText",
    promptContains: "Threads",
  },
  {
    name: "tiktok",
    gen: generateTikTokContent as Generator,
    output: tiktokOutputFixture,
    maxTokens: 4096,
    assert: (c) => expect(c.hook).toBe(tiktokOutputFixture.hook),
    breakField: "hook",
    promptContains: "TikTok",
  },
  {
    name: "twitter",
    gen: generateTwitterContent as Generator,
    output: twitterOutputFixture,
    maxTokens: 4096,
    assert: (c) =>
      expect((c.threadSeparated as string[]).length).toBeGreaterThan(0),
    breakField: "tweets",
    promptContains: "Twitter",
  },
  {
    name: "youtube",
    gen: generateYouTubeContent as Generator,
    output: youtubeOutputFixture,
    maxTokens: 8192,
    assert: (c) => expect(c.title).toBe(youtubeOutputFixture.title),
    breakField: "title",
    promptContains: campaignStrategyFixture.campaignName,
  },
];

describe.each(cases)(
  "$name content generator",
  ({ gen, output, maxTokens, assert, breakField, promptContains }) => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("returns validated content and summed token usage on success", async () => {
      mockCreate.mockResolvedValue(claudeResponse(output, 400, 600));

      const result = await call(gen);

      assert(result.content as Record<string, unknown>);
      expect(result.tokensUsed).toBe(1000);
    });

    it("falls back to 0 when usage token fields are missing", async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: "text", text: JSON.stringify(output) }],
        // usage present but token fields undefined -> exercises `|| 0` fallback.
        usage: {} as { input_tokens: number; output_tokens: number },
      } as Awaited<ReturnType<typeof anthropic.messages.create>>);

      const result = await call(gen);
      expect(result.tokensUsed).toBe(0);
    });

    it("calls Claude with the configured model, JSON-only system prompt, and platform max_tokens", async () => {
      mockCreate.mockResolvedValue(claudeResponse(output));

      await call(gen);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: CLAUDE_MODEL,
          max_tokens: maxTokens,
          system: expect.stringContaining("valid JSON only"),
        })
      );
    });

    it("interpolates campaign/platform context into the user prompt", async () => {
      mockCreate.mockResolvedValue(claudeResponse(output));

      await call(gen);

      const userMessage = mockCreate.mock.calls[0][0].messages[0]
        .content as string;
      expect(userMessage).toContain(promptContains);
    });

    it("extracts JSON wrapped in a markdown code block", async () => {
      const wrapped = `Here you go:\n\`\`\`json\n${JSON.stringify(output)}\n\`\`\``;
      mockCreate.mockResolvedValue({
        content: [{ type: "text", text: wrapped }],
        usage: { input_tokens: 10, output_tokens: 20 },
      } as Awaited<ReturnType<typeof anthropic.messages.create>>);

      const result = await call(gen);
      assert(result.content as Record<string, unknown>);
    });

    it("treats a non-text first content block as empty and rejects", async () => {
      const restore = patchSetTimeout();
      mockCreate.mockResolvedValue({
        content: [{ type: "tool_use", id: "x", name: "y", input: {} }],
        usage: { input_tokens: 10, output_tokens: 20 },
      } as unknown as Awaited<ReturnType<typeof anthropic.messages.create>>);

      await expect(call(gen)).rejects.toThrow();
      restore();
    });

    it("rejects when Claude returns non-JSON text", async () => {
      const restore = patchSetTimeout();
      mockCreate.mockResolvedValue({
        content: [{ type: "text", text: "totally not json" }],
        usage: { input_tokens: 10, output_tokens: 20 },
      } as Awaited<ReturnType<typeof anthropic.messages.create>>);

      await expect(call(gen)).rejects.toThrow();
      restore();
    });

    it("rejects when a required field is missing (Zod validation)", async () => {
      const restore = patchSetTimeout();
      const broken = { ...(output as Record<string, unknown>) };
      delete broken[breakField];
      mockCreate.mockResolvedValue(claudeResponse(broken));

      await expect(call(gen)).rejects.toThrow();
      restore();
    });
  }
);
