import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateCampaignStrategy } from "../campaign-strategy";
import { quizFixture } from "../__fixtures__/quiz";
import { audienceProfileFixture } from "../__fixtures__/audience";
import { campaignStrategyFixture } from "../__fixtures__/campaign";
import type { CampaignPlatform } from "@/types";

// Mock the claude client
vi.mock("@/lib/claude", () => ({
  anthropic: {
    messages: {
      create: vi.fn(),
    },
  },
}));

// Mock db
vi.mock("@/lib/db", () => ({
  db: { insert: vi.fn().mockReturnValue({ values: vi.fn() }) },
}));

vi.mock("@/lib/db/schema", () => ({
  agentRuns: {},
}));

import { anthropic } from "@/lib/claude";

const mockCreate = vi.mocked(anthropic.messages.create);

const selectedPlatforms: CampaignPlatform[] = ["twitter", "linkedin", "reddit"];

describe("generateCampaignStrategy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns validated campaign strategy on success", async () => {
    mockCreate.mockResolvedValue({
      content: [
        { type: "text", text: JSON.stringify(campaignStrategyFixture) },
      ],
      usage: { input_tokens: 800, output_tokens: 1500 },
    } as Awaited<ReturnType<typeof anthropic.messages.create>>);

    const result = await generateCampaignStrategy(
      audienceProfileFixture,
      quizFixture,
      selectedPlatforms
    );

    expect(result.strategy).toEqual(campaignStrategyFixture);
    expect(result.modelUsed).toBe("claude-sonnet-4-20250514");
    expect(result.tokensUsed).toBe(2300);
  });

  it("includes audience profile data in the prompt", async () => {
    mockCreate.mockResolvedValue({
      content: [
        { type: "text", text: JSON.stringify(campaignStrategyFixture) },
      ],
      usage: { input_tokens: 800, output_tokens: 1500 },
    } as Awaited<ReturnType<typeof anthropic.messages.create>>);

    await generateCampaignStrategy(
      audienceProfileFixture,
      quizFixture,
      selectedPlatforms
    );

    const callArgs = mockCreate.mock.calls[0][0];
    const userMessage = callArgs.messages[0].content as string;

    // Should include persona names
    expect(userMessage).toContain("Alex the Solo Founder");
    // Should include selected platforms
    expect(userMessage).toContain("twitter");
    expect(userMessage).toContain("linkedin");
    expect(userMessage).toContain("reddit");
    // Should include quiz data
    expect(userMessage).toContain(quizFixture.elevatorPitch);
  });

  it("sends correct system prompt for campaign strategy", async () => {
    mockCreate.mockResolvedValue({
      content: [
        { type: "text", text: JSON.stringify(campaignStrategyFixture) },
      ],
      usage: { input_tokens: 800, output_tokens: 1500 },
    } as Awaited<ReturnType<typeof anthropic.messages.create>>);

    await generateCampaignStrategy(
      audienceProfileFixture,
      quizFixture,
      selectedPlatforms
    );

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining("campaign strategist"),
      })
    );
  });

  it("throws when strategy fails Zod validation", async () => {
    const invalidStrategy = {
      ...campaignStrategyFixture,
      platformAllocations: [], // min 1 required
    };

    const originalSetTimeout = globalThis.setTimeout;
    vi.stubGlobal("setTimeout", (fn: (...args: unknown[]) => void) => {
      Promise.resolve().then(() => fn());
      return 0 as unknown as ReturnType<typeof setTimeout>;
    });

    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify(invalidStrategy) }],
      usage: { input_tokens: 800, output_tokens: 1500 },
    } as Awaited<ReturnType<typeof anthropic.messages.create>>);

    await expect(
      generateCampaignStrategy(
        audienceProfileFixture,
        quizFixture,
        selectedPlatforms
      )
    ).rejects.toThrow();

    vi.stubGlobal("setTimeout", originalSetTimeout);
  });

  it("retries on API failure and succeeds", async () => {
    const originalSetTimeout = globalThis.setTimeout;
    vi.stubGlobal("setTimeout", (fn: (...args: unknown[]) => void) => {
      Promise.resolve().then(() => fn());
      return 0 as unknown as ReturnType<typeof setTimeout>;
    });

    mockCreate
      .mockRejectedValueOnce(new Error("rate limit"))
      .mockResolvedValue({
        content: [
          { type: "text", text: JSON.stringify(campaignStrategyFixture) },
        ],
        usage: { input_tokens: 800, output_tokens: 1500 },
      } as Awaited<ReturnType<typeof anthropic.messages.create>>);

    const result = await generateCampaignStrategy(
      audienceProfileFixture,
      quizFixture,
      selectedPlatforms
    );

    expect(result.strategy).toEqual(campaignStrategyFixture);
    expect(mockCreate).toHaveBeenCalledTimes(2);

    vi.stubGlobal("setTimeout", originalSetTimeout);
  });

  it("works with different platform selections", async () => {
    const singlePlatform: CampaignPlatform[] = ["blog"];
    const singlePlatformStrategy = {
      ...campaignStrategyFixture,
      platformAllocations: [
        {
          platform: "blog" as const,
          role: "authority building",
          contentFocus: "SEO-optimized articles",
          frequencySuggestion: "2x per week",
          priorityOrder: 1,
        },
      ],
    };

    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify(singlePlatformStrategy) }],
      usage: { input_tokens: 800, output_tokens: 1500 },
    } as Awaited<ReturnType<typeof anthropic.messages.create>>);

    const result = await generateCampaignStrategy(
      audienceProfileFixture,
      quizFixture,
      singlePlatform
    );

    expect(result.strategy.platformAllocations).toHaveLength(1);
    expect(result.strategy.platformAllocations[0].platform).toBe("blog");
  });
});
