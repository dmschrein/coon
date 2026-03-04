import { describe, it, expect, vi, beforeEach } from "vitest";
import { analyzeAudience } from "../audience-analysis";
import { quizFixture } from "../__fixtures__/quiz";
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

describe("analyzeAudience", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns validated audience profile on successful response", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify(audienceProfileFixture) }],
      usage: { input_tokens: 500, output_tokens: 1000 },
    } as Awaited<ReturnType<typeof anthropic.messages.create>>);

    const result = await analyzeAudience(quizFixture);

    expect(result.profile).toEqual(audienceProfileFixture);
    expect(result.modelUsed).toBe("claude-sonnet-4-20250514");
    expect(result.tokensUsed).toBe(1500);
  });

  it("calls Claude with correct model and system prompt", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify(audienceProfileFixture) }],
      usage: { input_tokens: 500, output_tokens: 1000 },
    } as Awaited<ReturnType<typeof anthropic.messages.create>>);

    await analyzeAudience(quizFixture);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: expect.stringContaining("expert market researcher"),
      })
    );
  });

  it("includes quiz data in the prompt", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify(audienceProfileFixture) }],
      usage: { input_tokens: 500, output_tokens: 1000 },
    } as Awaited<ReturnType<typeof anthropic.messages.create>>);

    await analyzeAudience(quizFixture);

    const callArgs = mockCreate.mock.calls[0][0];
    const userMessage = callArgs.messages[0].content as string;
    expect(userMessage).toContain(quizFixture.elevatorPitch);
    expect(userMessage).toContain(quizFixture.problemSolved);
    expect(userMessage).toContain(quizFixture.productType);
  });

  it("extracts JSON from markdown code blocks in response", async () => {
    const wrappedResponse = `Here is the audience profile:\n\`\`\`json\n${JSON.stringify(audienceProfileFixture)}\n\`\`\``;

    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: wrappedResponse }],
      usage: { input_tokens: 500, output_tokens: 1000 },
    } as Awaited<ReturnType<typeof anthropic.messages.create>>);

    const result = await analyzeAudience(quizFixture);
    expect(result.profile).toEqual(audienceProfileFixture);
  });

  it("throws when Claude returns invalid JSON", async () => {
    // Mock setTimeout to resolve immediately for retry
    const originalSetTimeout = globalThis.setTimeout;
    vi.stubGlobal("setTimeout", (fn: (...args: unknown[]) => void) => {
      Promise.resolve().then(() => fn());
      return 0 as unknown as ReturnType<typeof setTimeout>;
    });

    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "This is not JSON at all." }],
      usage: { input_tokens: 500, output_tokens: 100 },
    } as Awaited<ReturnType<typeof anthropic.messages.create>>);

    await expect(analyzeAudience(quizFixture)).rejects.toThrow();

    vi.stubGlobal("setTimeout", originalSetTimeout);
  });

  it("throws when response fails Zod validation", async () => {
    const invalidProfile = { ...audienceProfileFixture, primaryPersonas: [] };

    const originalSetTimeout = globalThis.setTimeout;
    vi.stubGlobal("setTimeout", (fn: (...args: unknown[]) => void) => {
      Promise.resolve().then(() => fn());
      return 0 as unknown as ReturnType<typeof setTimeout>;
    });

    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify(invalidProfile) }],
      usage: { input_tokens: 500, output_tokens: 1000 },
    } as Awaited<ReturnType<typeof anthropic.messages.create>>);

    await expect(analyzeAudience(quizFixture)).rejects.toThrow();

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
          { type: "text", text: JSON.stringify(audienceProfileFixture) },
        ],
        usage: { input_tokens: 500, output_tokens: 1000 },
      } as Awaited<ReturnType<typeof anthropic.messages.create>>);

    const result = await analyzeAudience(quizFixture);
    expect(result.profile).toEqual(audienceProfileFixture);
    expect(mockCreate).toHaveBeenCalledTimes(2);

    vi.stubGlobal("setTimeout", originalSetTimeout);
  });

  it("calculates total tokens from input + output", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify(audienceProfileFixture) }],
      usage: { input_tokens: 800, output_tokens: 2000 },
    } as Awaited<ReturnType<typeof anthropic.messages.create>>);

    const result = await analyzeAudience(quizFixture);
    expect(result.tokensUsed).toBe(2800);
  });
});
