import { describe, it, expect, vi, beforeEach } from "vitest";
import { draftReply } from "../reply-drafter";
import {
  replyDraftFixture,
  replyDraftInputFixture,
  twitterReplyDraftFixture,
} from "../__fixtures__/reply-draft";

// Mock the claude client
vi.mock("@/lib/claude", () => ({
  anthropic: {
    messages: {
      create: vi.fn(),
    },
  },
}));

// Mock db to prevent actual database connections
vi.mock("@/lib/db", () => ({
  db: { insert: vi.fn().mockReturnValue({ values: vi.fn() }) },
}));

vi.mock("@/lib/db/schema", () => ({
  agentRuns: {},
}));

import { anthropic } from "@/lib/claude";

const mockCreate = vi.mocked(anthropic.messages.create);

describe("draftReply", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns validated reply drafts on successful response", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify(replyDraftFixture) }],
      usage: { input_tokens: 300, output_tokens: 500 },
    } as Awaited<ReturnType<typeof anthropic.messages.create>>);

    const { result } = await draftReply(replyDraftInputFixture);

    expect(result.drafts).toHaveLength(3);
    expect(result.drafts[0].tone).toBe("affirming");
    expect(result.drafts[1].tone).toBe("curious");
    expect(result.drafts[2].tone).toBe("value-adding");
  });

  it("returns model and token metadata", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify(replyDraftFixture) }],
      usage: { input_tokens: 300, output_tokens: 500 },
    } as Awaited<ReturnType<typeof anthropic.messages.create>>);

    const { modelUsed, tokensUsed } = await draftReply(replyDraftInputFixture);

    expect(modelUsed).toBe("claude-sonnet-4-20250514");
    expect(tokensUsed).toBe(800);
  });

  it("calls Claude with correct system prompt", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify(replyDraftFixture) }],
      usage: { input_tokens: 300, output_tokens: 500 },
    } as Awaited<ReturnType<typeof anthropic.messages.create>>);

    await draftReply(replyDraftInputFixture);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: expect.stringContaining("community manager"),
      })
    );
  });

  it("includes platform and author in the prompt", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify(replyDraftFixture) }],
      usage: { input_tokens: 300, output_tokens: 500 },
    } as Awaited<ReturnType<typeof anthropic.messages.create>>);

    await draftReply(replyDraftInputFixture);

    const callArgs = mockCreate.mock.calls[0][0];
    const userMessage = callArgs.messages[0].content as string;
    expect(userMessage).toContain("twitter");
    expect(userMessage).toContain("@happy_user");
    expect(userMessage).toContain("280");
  });

  it("enforces platform character limits on drafts", async () => {
    const longDraft = {
      drafts: [
        {
          text: "x".repeat(300),
          tone: "affirming",
          rationale: "test",
        },
        {
          text: "y".repeat(300),
          tone: "curious",
          rationale: "test",
        },
        {
          text: "z".repeat(100),
          tone: "value-adding",
          rationale: "test",
        },
      ],
    };

    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify(longDraft) }],
      usage: { input_tokens: 300, output_tokens: 500 },
    } as Awaited<ReturnType<typeof anthropic.messages.create>>);

    const { result } = await draftReply(replyDraftInputFixture);

    // Twitter limit is 280
    expect(result.drafts[0].text.length).toBeLessThanOrEqual(280);
    expect(result.drafts[1].text.length).toBeLessThanOrEqual(280);
    expect(result.drafts[2].text.length).toBeLessThanOrEqual(280);
  });

  it("extracts JSON from markdown code blocks", async () => {
    const wrappedResponse = `Here are the drafts:\n\`\`\`json\n${JSON.stringify(replyDraftFixture)}\n\`\`\``;

    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: wrappedResponse }],
      usage: { input_tokens: 300, output_tokens: 500 },
    } as Awaited<ReturnType<typeof anthropic.messages.create>>);

    const { result } = await draftReply(replyDraftInputFixture);
    expect(result.drafts).toHaveLength(3);
  });

  it("throws when Claude returns invalid JSON", async () => {
    const originalSetTimeout = globalThis.setTimeout;
    vi.stubGlobal("setTimeout", (fn: (...args: unknown[]) => void) => {
      Promise.resolve().then(() => fn());
      return 0 as unknown as ReturnType<typeof setTimeout>;
    });

    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "Not JSON at all" }],
      usage: { input_tokens: 300, output_tokens: 100 },
    } as Awaited<ReturnType<typeof anthropic.messages.create>>);

    await expect(draftReply(replyDraftInputFixture)).rejects.toThrow();

    vi.stubGlobal("setTimeout", originalSetTimeout);
  });

  it("retries on Claude API failure", async () => {
    const originalSetTimeout = globalThis.setTimeout;
    vi.stubGlobal("setTimeout", (fn: (...args: unknown[]) => void) => {
      Promise.resolve().then(() => fn());
      return 0 as unknown as ReturnType<typeof setTimeout>;
    });

    mockCreate
      .mockRejectedValueOnce(new Error("API overloaded"))
      .mockResolvedValue({
        content: [
          { type: "text", text: JSON.stringify(twitterReplyDraftFixture) },
        ],
        usage: { input_tokens: 300, output_tokens: 500 },
      } as Awaited<ReturnType<typeof anthropic.messages.create>>);

    const { result } = await draftReply(replyDraftInputFixture);
    expect(result.drafts).toHaveLength(3);
    expect(mockCreate).toHaveBeenCalledTimes(2);

    vi.stubGlobal("setTimeout", originalSetTimeout);
  });

  it("uses correct char limit for non-twitter platforms", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify(replyDraftFixture) }],
      usage: { input_tokens: 300, output_tokens: 500 },
    } as Awaited<ReturnType<typeof anthropic.messages.create>>);

    await draftReply({
      ...replyDraftInputFixture,
      platform: "instagram",
    });

    const callArgs = mockCreate.mock.calls[0][0];
    const userMessage = callArgs.messages[0].content as string;
    expect(userMessage).toContain("2200");
  });
});
