import { describe, it, expect, vi, beforeEach } from "vitest";
import { analyzeFeedbackLoop } from "../feedback-loop";
import {
  feedbackEngagementFixture,
  feedbackOutputFixture,
} from "../__fixtures__/feedback";
import { audienceProfileFixture } from "../__fixtures__/audience";

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

const defaultInput = {
  engagementData: feedbackEngagementFixture,
  currentAudienceProfile: audienceProfileFixture,
  contentPillars: ["Build in Public", "Audience Growth", "Product Marketing"],
};

describe("analyzeFeedbackLoop", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns validated feedback output on successful response", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify(feedbackOutputFixture) }],
      usage: { input_tokens: 800, output_tokens: 1200 },
    } as Awaited<ReturnType<typeof anthropic.messages.create>>);

    const result = await analyzeFeedbackLoop(defaultInput);

    expect(result.result).toEqual(feedbackOutputFixture);
    expect(result.modelUsed).toBe("claude-sonnet-4-20250514");
    expect(result.tokensUsed).toBe(2000);
  });

  it("includes engagement data and profile in the prompt", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify(feedbackOutputFixture) }],
      usage: { input_tokens: 800, output_tokens: 1200 },
    } as Awaited<ReturnType<typeof anthropic.messages.create>>);

    await analyzeFeedbackLoop(defaultInput);

    const callArgs = mockCreate.mock.calls[0][0];
    const userMessage = callArgs.messages[0].content as string;
    expect(userMessage).toContain("Build in Public");
    expect(userMessage).toContain("engagement_rate");
    expect(userMessage).toContain("primaryPersonas");
  });

  it("calls Claude with correct model and system prompt", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify(feedbackOutputFixture) }],
      usage: { input_tokens: 800, output_tokens: 1200 },
    } as Awaited<ReturnType<typeof anthropic.messages.create>>);

    await analyzeFeedbackLoop(defaultInput);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: expect.stringContaining("audience strategist"),
      })
    );
  });

  it("extracts JSON from markdown code blocks in response", async () => {
    const wrappedResponse = `Here are the results:\n\`\`\`json\n${JSON.stringify(feedbackOutputFixture)}\n\`\`\``;

    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: wrappedResponse }],
      usage: { input_tokens: 800, output_tokens: 1200 },
    } as Awaited<ReturnType<typeof anthropic.messages.create>>);

    const result = await analyzeFeedbackLoop(defaultInput);
    expect(result.result).toEqual(feedbackOutputFixture);
  });

  it("throws when Claude returns invalid JSON", async () => {
    const originalSetTimeout = globalThis.setTimeout;
    vi.stubGlobal("setTimeout", (fn: (...args: unknown[]) => void) => {
      Promise.resolve().then(() => fn());
      return 0 as unknown as ReturnType<typeof setTimeout>;
    });

    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "This is not JSON at all." }],
      usage: { input_tokens: 500, output_tokens: 100 },
    } as Awaited<ReturnType<typeof anthropic.messages.create>>);

    await expect(analyzeFeedbackLoop(defaultInput)).rejects.toThrow();

    vi.stubGlobal("setTimeout", originalSetTimeout);
  });

  it("throws when response fails Zod validation", async () => {
    const invalidOutput = { changes: [], summary: "", confidence: 0.5 };

    const originalSetTimeout = globalThis.setTimeout;
    vi.stubGlobal("setTimeout", (fn: (...args: unknown[]) => void) => {
      Promise.resolve().then(() => fn());
      return 0 as unknown as ReturnType<typeof setTimeout>;
    });

    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify(invalidOutput) }],
      usage: { input_tokens: 800, output_tokens: 200 },
    } as Awaited<ReturnType<typeof anthropic.messages.create>>);

    await expect(analyzeFeedbackLoop(defaultInput)).rejects.toThrow();

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
          { type: "text", text: JSON.stringify(feedbackOutputFixture) },
        ],
        usage: { input_tokens: 800, output_tokens: 1200 },
      } as Awaited<ReturnType<typeof anthropic.messages.create>>);

    const result = await analyzeFeedbackLoop(defaultInput);
    expect(result.result).toEqual(feedbackOutputFixture);
    expect(mockCreate).toHaveBeenCalledTimes(2);

    vi.stubGlobal("setTimeout", originalSetTimeout);
  });

  it("calculates total tokens from input + output", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify(feedbackOutputFixture) }],
      usage: { input_tokens: 1200, output_tokens: 800 },
    } as Awaited<ReturnType<typeof anthropic.messages.create>>);

    const result = await analyzeFeedbackLoop(defaultInput);
    expect(result.tokensUsed).toBe(2000);
  });

  it("accepts valid output with empty changes array", async () => {
    const emptyChanges = {
      changes: [],
      summary: "No significant patterns found in the data.",
      confidence: 0.15,
    };

    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify(emptyChanges) }],
      usage: { input_tokens: 800, output_tokens: 200 },
    } as Awaited<ReturnType<typeof anthropic.messages.create>>);

    const result = await analyzeFeedbackLoop(defaultInput);
    expect(result.result.changes).toEqual([]);
    expect(result.result.confidence).toBe(0.15);
  });

  it("validates confidence is between 0 and 1", async () => {
    const invalidConfidence = {
      changes: [],
      summary: "Some summary.",
      confidence: 1.5,
    };

    const originalSetTimeout = globalThis.setTimeout;
    vi.stubGlobal("setTimeout", (fn: (...args: unknown[]) => void) => {
      Promise.resolve().then(() => fn());
      return 0 as unknown as ReturnType<typeof setTimeout>;
    });

    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify(invalidConfidence) }],
      usage: { input_tokens: 800, output_tokens: 200 },
    } as Awaited<ReturnType<typeof anthropic.messages.create>>);

    await expect(analyzeFeedbackLoop(defaultInput)).rejects.toThrow();

    vi.stubGlobal("setTimeout", originalSetTimeout);
  });
});
