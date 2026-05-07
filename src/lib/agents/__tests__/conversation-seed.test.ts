import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateConversationSeeds, PLATFORM_TONE } from "../conversation-seed";
import { seedInputFixture, seedOutputFixture } from "../__fixtures__/seeds";

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

const fastSetTimeout = (() => {
  const fn = (cb: (...args: unknown[]) => void) => {
    Promise.resolve().then(() => cb());
    return 0 as unknown as ReturnType<typeof setTimeout>;
  };
  return fn;
})();

function mockReply(output: unknown) {
  mockCreate.mockResolvedValue({
    content: [{ type: "text", text: JSON.stringify(output) }],
    usage: { input_tokens: 600, output_tokens: 900 },
  } as Awaited<ReturnType<typeof anthropic.messages.create>>);
}

describe("generateConversationSeeds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 5 validated seeds by default when count is omitted", async () => {
    mockReply(seedOutputFixture);

    const { count: _omit, ...inputWithoutCount } = seedInputFixture;
    const result = await generateConversationSeeds(inputWithoutCount);

    expect(result.seeds).toHaveLength(5);
    expect(result.modelUsed).toBe("claude-sonnet-4-20250514");
    expect(result.tokensUsed).toBe(1500);

    const callArgs = mockCreate.mock.calls[0][0];
    const userMessage = callArgs.messages[0].content as string;
    expect(userMessage).toContain("EXACTLY 5 seeds");
  });

  it("respects a custom count by injecting it into the prompt", async () => {
    const eightSeeds = {
      seeds: [
        ...seedOutputFixture.seeds,
        ...seedOutputFixture.seeds.slice(0, 3),
      ],
    };
    mockReply(eightSeeds);

    const result = await generateConversationSeeds({
      ...seedInputFixture,
      count: 8,
    });

    expect(result.seeds).toHaveLength(8);
    const callArgs = mockCreate.mock.calls[0][0];
    const userMessage = callArgs.messages[0].content as string;
    expect(userMessage).toContain("EXACTLY 8 seeds");
    expect(userMessage).toContain("Generate 8 conversation-starter");
  });

  it("returns seeds where every seed has type, text, and rationale", async () => {
    mockReply(seedOutputFixture);

    const result = await generateConversationSeeds(seedInputFixture);

    for (const seed of result.seeds) {
      expect(seed.type).toMatch(/^(question|poll|challenge|hot_take)$/);
      expect(seed.text.length).toBeGreaterThan(0);
      expect(seed.rationale.length).toBeGreaterThan(0);
    }
  });

  it("uses the Reddit tone for reddit platform and the LinkedIn tone for linkedin", async () => {
    mockReply(seedOutputFixture);
    await generateConversationSeeds({
      ...seedInputFixture,
      platform: "reddit",
    });
    const redditPrompt = mockCreate.mock.calls[0][0].messages[0]
      .content as string;

    mockCreate.mockClear();
    mockReply(seedOutputFixture);
    await generateConversationSeeds({
      ...seedInputFixture,
      platform: "linkedin",
    });
    const linkedinPrompt = mockCreate.mock.calls[0][0].messages[0]
      .content as string;

    expect(redditPrompt).toContain(PLATFORM_TONE.reddit);
    expect(redditPrompt).toContain("no marketing speak");
    expect(redditPrompt).not.toContain(PLATFORM_TONE.linkedin);

    expect(linkedinPrompt).toContain(PLATFORM_TONE.linkedin);
    expect(linkedinPrompt).toContain("Professional insight");
    expect(linkedinPrompt).not.toContain(PLATFORM_TONE.reddit);
  });

  it("propagates the Discord and Twitter tones into the prompt", async () => {
    mockReply(seedOutputFixture);
    await generateConversationSeeds({
      ...seedInputFixture,
      platform: "discord",
    });
    const discordPrompt = mockCreate.mock.calls[0][0].messages[0]
      .content as string;

    mockCreate.mockClear();
    mockReply(seedOutputFixture);
    await generateConversationSeeds({
      ...seedInputFixture,
      platform: "twitter",
    });
    const twitterPrompt = mockCreate.mock.calls[0][0].messages[0]
      .content as string;

    expect(discordPrompt).toContain(PLATFORM_TONE.discord);
    expect(discordPrompt).toContain("community-first");

    expect(twitterPrompt).toContain(PLATFORM_TONE.twitter);
    expect(twitterPrompt).toContain("scroll-stopping");
  });

  it("throws when the LLM omits a required seed field", async () => {
    const originalSetTimeout = globalThis.setTimeout;
    vi.stubGlobal("setTimeout", fastSetTimeout);

    const malformed = {
      seeds: [
        {
          type: "question",
          text: "Where do you spend pre-launch time?",
          // rationale missing
        },
      ],
    };
    mockReply(malformed);

    await expect(generateConversationSeeds(seedInputFixture)).rejects.toThrow();

    vi.stubGlobal("setTimeout", originalSetTimeout);
  });

  it("retries on transient API failure and succeeds", async () => {
    const originalSetTimeout = globalThis.setTimeout;
    vi.stubGlobal("setTimeout", fastSetTimeout);

    mockCreate
      .mockRejectedValueOnce(new Error("rate limit"))
      .mockResolvedValue({
        content: [{ type: "text", text: JSON.stringify(seedOutputFixture) }],
        usage: { input_tokens: 600, output_tokens: 900 },
      } as Awaited<ReturnType<typeof anthropic.messages.create>>);

    const result = await generateConversationSeeds(seedInputFixture);

    expect(result.seeds).toHaveLength(5);
    expect(mockCreate).toHaveBeenCalledTimes(2);

    vi.stubGlobal("setTimeout", originalSetTimeout);
  });
});
