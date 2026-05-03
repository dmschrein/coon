import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkModeration } from "../moderation-checker";

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

const baseInput = {
  messageText: "hello",
  authorHandle: "user1",
  platform: "twitter",
};

function mockResponse(payload: unknown) {
  mockCreate.mockResolvedValue({
    content: [{ type: "text", text: JSON.stringify(payload) }],
    usage: { input_tokens: 200, output_tokens: 50 },
  } as Awaited<ReturnType<typeof anthropic.messages.create>>);
}

describe("checkModeration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("flags obvious spam with high confidence", async () => {
    mockResponse({
      flagged: true,
      reason: "Promotional spam with link to suspicious site",
      confidence: 0.95,
      category: "spam",
    });

    const { result } = await checkModeration({
      messageText: "BUY CHEAP MEDS NOW http://sketchy.example",
      authorHandle: "spammer123",
      platform: "twitter",
    });

    expect(result.flagged).toBe(true);
    expect(result.category).toBe("spam");
    expect(result.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it("does not flag a friendly comment", async () => {
    mockResponse({ flagged: false, confidence: 0.95 });

    const { result } = await checkModeration({
      ...baseInput,
      messageText: "love this post! really helpful, thanks for sharing.",
    });

    expect(result.flagged).toBe(false);
    expect(result.category).toBeUndefined();
  });

  it("stays conservative on mild self-promotion", async () => {
    mockResponse({ flagged: false, confidence: 0.6 });

    const { result } = await checkModeration({
      ...baseInput,
      messageText:
        "this reminds me — I write about a similar topic in my newsletter",
    });

    expect(result.flagged).toBe(false);
  });

  it("returns model name and total token usage", async () => {
    mockResponse({ flagged: false, confidence: 0.9 });

    const out = await checkModeration(baseInput);

    expect(out.modelUsed).toBe("claude-sonnet-4-20250514");
    expect(out.tokensUsed).toBe(250);
  });

  it("calls Claude with the moderation system prompt and message context", async () => {
    mockResponse({ flagged: false, confidence: 0.9 });

    await checkModeration({
      messageText: "great thread!",
      authorHandle: "alice",
      platform: "linkedin",
    });

    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.model).toBe("claude-sonnet-4-20250514");
    expect(callArgs.system).toContain("moderation");
    const userMessage = callArgs.messages[0].content as string;
    expect(userMessage).toContain("@alice");
    expect(userMessage).toContain("linkedin");
    expect(userMessage).toContain("great thread!");
  });

  it("extracts JSON from markdown-fenced response", async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text:
            "Here you go:\n```json\n" +
            JSON.stringify({
              flagged: true,
              reason: "Hate speech",
              confidence: 0.92,
              category: "toxicity",
            }) +
            "\n```",
        },
      ],
      usage: { input_tokens: 200, output_tokens: 50 },
    } as Awaited<ReturnType<typeof anthropic.messages.create>>);

    const { result } = await checkModeration({
      ...baseInput,
      messageText: "ugly toxic comment",
    });

    expect(result.flagged).toBe(true);
    expect(result.category).toBe("toxicity");
  });

  it("throws when confidence is out of [0,1] range", async () => {
    const originalSetTimeout = globalThis.setTimeout;
    vi.stubGlobal("setTimeout", (fn: (...args: unknown[]) => void) => {
      Promise.resolve().then(() => fn());
      return 0 as unknown as ReturnType<typeof setTimeout>;
    });

    mockResponse({ flagged: true, confidence: 1.5, category: "spam" });

    await expect(checkModeration(baseInput)).rejects.toThrow();

    vi.stubGlobal("setTimeout", originalSetTimeout);
  });
});
