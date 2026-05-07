import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateEventContent } from "../campaign-content/event";
import { audienceProfileFixture } from "../__fixtures__/audience";

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

const validOutput = {
  posts: [
    {
      type: "announcement",
      text: "Big news — I'm hosting a launch AMA next week. Drop your questions early.",
    },
    {
      type: "reminder",
      text: "Tomorrow: launch AMA. Bring the hardest question you've got about shipping solo.",
    },
    {
      type: "day_of",
      text: "Starting in 2 hours. Last chance to RSVP — link below.",
    },
  ],
};

const baseInput = {
  eventTitle: "Launch AMA",
  eventDescription: "Ask me anything about shipping a B2B SaaS solo.",
  platform: "twitter" as const,
  eventDatetime: "2026-06-01T18:00:00-07:00",
  audienceProfile: audienceProfileFixture,
};

describe("generateEventContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns three posts of distinct types on a valid response", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify(validOutput) }],
      usage: { input_tokens: 400, output_tokens: 600 },
    } as Awaited<ReturnType<typeof anthropic.messages.create>>);

    const result = await generateEventContent(baseInput);

    expect(result.content.posts).toHaveLength(3);
    const types = result.content.posts.map((p) => p.type);
    expect(types).toEqual(["announcement", "reminder", "day_of"]);
    expect(result.tokensUsed).toBe(1000);
  });

  it("calls Claude with the configured model and a JSON-only system prompt", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify(validOutput) }],
      usage: { input_tokens: 400, output_tokens: 600 },
    } as Awaited<ReturnType<typeof anthropic.messages.create>>);

    await generateEventContent(baseInput);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-sonnet-4-20250514",
        system: expect.stringContaining("JSON only"),
      })
    );
  });

  it("injects event details and audience context into the prompt", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify(validOutput) }],
      usage: { input_tokens: 400, output_tokens: 600 },
    } as Awaited<ReturnType<typeof anthropic.messages.create>>);

    await generateEventContent(baseInput);

    const callArgs = mockCreate.mock.calls[0][0];
    const userMessage = callArgs.messages[0].content as string;
    expect(userMessage).toContain(baseInput.eventTitle);
    expect(userMessage).toContain(baseInput.eventDescription);
    expect(userMessage).toContain(baseInput.eventDatetime);
    expect(userMessage).toContain(
      audienceProfileFixture.primaryPersonas[0].name
    );
  });

  it("emits platform-specific guidance for the chosen platform", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify(validOutput) }],
      usage: { input_tokens: 400, output_tokens: 600 },
    } as Awaited<ReturnType<typeof anthropic.messages.create>>);

    await generateEventContent({ ...baseInput, platform: "twitter" });

    const userMessage = mockCreate.mock.calls[0][0].messages[0]
      .content as string;
    expect(userMessage).toContain("280");
  });

  it("extracts JSON from markdown code blocks", async () => {
    const wrapped = `\`\`\`json\n${JSON.stringify(validOutput)}\n\`\`\``;
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: wrapped }],
      usage: { input_tokens: 400, output_tokens: 600 },
    } as Awaited<ReturnType<typeof anthropic.messages.create>>);

    const result = await generateEventContent(baseInput);
    expect(result.content.posts).toHaveLength(3);
  });

  it("throws when Claude returns malformed JSON", async () => {
    const originalSetTimeout = globalThis.setTimeout;
    vi.stubGlobal("setTimeout", (fn: (...args: unknown[]) => void) => {
      Promise.resolve().then(() => fn());
      return 0 as unknown as ReturnType<typeof setTimeout>;
    });

    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "totally not json" }],
      usage: { input_tokens: 100, output_tokens: 50 },
    } as Awaited<ReturnType<typeof anthropic.messages.create>>);

    await expect(generateEventContent(baseInput)).rejects.toThrow();

    vi.stubGlobal("setTimeout", originalSetTimeout);
  });

  it("throws when output is missing one of the three post types (Zod schema requires length 3)", async () => {
    const tooFew = { posts: validOutput.posts.slice(0, 2) };

    const originalSetTimeout = globalThis.setTimeout;
    vi.stubGlobal("setTimeout", (fn: (...args: unknown[]) => void) => {
      Promise.resolve().then(() => fn());
      return 0 as unknown as ReturnType<typeof setTimeout>;
    });

    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify(tooFew) }],
      usage: { input_tokens: 100, output_tokens: 50 },
    } as Awaited<ReturnType<typeof anthropic.messages.create>>);

    await expect(generateEventContent(baseInput)).rejects.toThrow();

    vi.stubGlobal("setTimeout", originalSetTimeout);
  });
});
