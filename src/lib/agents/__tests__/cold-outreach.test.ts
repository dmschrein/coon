import { describe, it, expect, vi, beforeEach } from "vitest";
import { draftColdOutreach } from "../cold-outreach";
import {
  coldOutreachInputFixture,
  coldOutreachOutputFixture,
  longColdOutreachOutputFixture,
  duplicateApproachOutputFixture,
} from "../__fixtures__/cold-outreach";

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

type CreateResult = Awaited<ReturnType<typeof anthropic.messages.create>>;

describe("draftColdOutreach", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns exactly 2 variants on a successful response", async () => {
    mockCreate.mockResolvedValue({
      content: [
        { type: "text", text: JSON.stringify(coldOutreachOutputFixture) },
      ],
      usage: { input_tokens: 300, output_tokens: 500 },
    } as CreateResult);

    const { result } = await draftColdOutreach(coldOutreachInputFixture);

    expect(result.variants).toHaveLength(2);
  });

  it("returns one direct variant and one value_first variant", async () => {
    mockCreate.mockResolvedValue({
      content: [
        { type: "text", text: JSON.stringify(coldOutreachOutputFixture) },
      ],
      usage: { input_tokens: 300, output_tokens: 500 },
    } as CreateResult);

    const { result } = await draftColdOutreach(coldOutreachInputFixture);

    const approaches = result.variants.map((v) => v.approach).sort();
    expect(approaches).toEqual(["direct", "value_first"]);
  });

  it("returns model and token metadata", async () => {
    mockCreate.mockResolvedValue({
      content: [
        { type: "text", text: JSON.stringify(coldOutreachOutputFixture) },
      ],
      usage: { input_tokens: 300, output_tokens: 500 },
    } as CreateResult);

    const { modelUsed, tokensUsed } = await draftColdOutreach(
      coldOutreachInputFixture
    );

    expect(modelUsed).toBe("claude-sonnet-4-20250514");
    expect(tokensUsed).toBe(800);
  });

  it("calls Claude with the outreach copywriter system prompt", async () => {
    mockCreate.mockResolvedValue({
      content: [
        { type: "text", text: JSON.stringify(coldOutreachOutputFixture) },
      ],
      usage: { input_tokens: 300, output_tokens: 500 },
    } as CreateResult);

    await draftColdOutreach(coldOutreachInputFixture);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: expect.stringContaining("outreach copywriter"),
      })
    );
  });

  it("includes prospect handle, product name, and persona in the prompt", async () => {
    mockCreate.mockResolvedValue({
      content: [
        { type: "text", text: JSON.stringify(coldOutreachOutputFixture) },
      ],
      usage: { input_tokens: 300, output_tokens: 500 },
    } as CreateResult);

    await draftColdOutreach(coldOutreachInputFixture);

    const callArgs = mockCreate.mock.calls[0][0];
    const userMessage = callArgs.messages[0].content as string;
    expect(userMessage).toContain("@indiebuilder");
    expect(userMessage).toContain("Coon");
    expect(userMessage).toContain("Solo Founder");
    expect(userMessage).toContain("Indie Builders");
  });

  it("instructs the model not to mention Claude or AI", async () => {
    mockCreate.mockResolvedValue({
      content: [
        { type: "text", text: JSON.stringify(coldOutreachOutputFixture) },
      ],
      usage: { input_tokens: 300, output_tokens: 500 },
    } as CreateResult);

    await draftColdOutreach(coldOutreachInputFixture);

    const callArgs = mockCreate.mock.calls[0][0];
    const userMessage = callArgs.messages[0].content as string;
    expect(userMessage).toContain("Claude");
    expect(userMessage).toContain("AI");
    expect(userMessage).toMatch(/Do NOT mention.*Claude/i);
  });

  it("instructs the model not to use 'community' in the first sentence", async () => {
    mockCreate.mockResolvedValue({
      content: [
        { type: "text", text: JSON.stringify(coldOutreachOutputFixture) },
      ],
      usage: { input_tokens: 300, output_tokens: 500 },
    } as CreateResult);

    await draftColdOutreach(coldOutreachInputFixture);

    const callArgs = mockCreate.mock.calls[0][0];
    const userMessage = callArgs.messages[0].content as string;
    expect(userMessage).toMatch(/community.*first sentence/i);
  });

  it("enforces 280-char limit on twitter messages and follow-ups", async () => {
    mockCreate.mockResolvedValue({
      content: [
        { type: "text", text: JSON.stringify(longColdOutreachOutputFixture) },
      ],
      usage: { input_tokens: 300, output_tokens: 500 },
    } as CreateResult);

    const { result } = await draftColdOutreach(coldOutreachInputFixture);

    for (const variant of result.variants) {
      expect(variant.message.length).toBeLessThanOrEqual(280);
      expect(variant.followUp.length).toBeLessThanOrEqual(280);
    }
  });

  it("enforces 500-char limit on non-twitter platforms", async () => {
    mockCreate.mockResolvedValue({
      content: [
        { type: "text", text: JSON.stringify(longColdOutreachOutputFixture) },
      ],
      usage: { input_tokens: 300, output_tokens: 500 },
    } as CreateResult);

    const { result } = await draftColdOutreach({
      ...coldOutreachInputFixture,
      prospect: { ...coldOutreachInputFixture.prospect, platform: "linkedin" },
    });

    for (const variant of result.variants) {
      expect(variant.message.length).toBeLessThanOrEqual(500);
      expect(variant.message.length).toBeGreaterThan(280);
      expect(variant.followUp.length).toBeLessThanOrEqual(500);
    }
  });

  it("interpolates the platform char limit into the prompt", async () => {
    mockCreate.mockResolvedValue({
      content: [
        { type: "text", text: JSON.stringify(coldOutreachOutputFixture) },
      ],
      usage: { input_tokens: 300, output_tokens: 500 },
    } as CreateResult);

    await draftColdOutreach({
      ...coldOutreachInputFixture,
      prospect: { ...coldOutreachInputFixture.prospect, platform: "linkedin" },
    });

    const callArgs = mockCreate.mock.calls[0][0];
    const userMessage = callArgs.messages[0].content as string;
    expect(userMessage).toContain("500");
  });

  it("extracts JSON from markdown code blocks", async () => {
    const wrappedResponse = `Here are the variants:\n\`\`\`json\n${JSON.stringify(coldOutreachOutputFixture)}\n\`\`\``;
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: wrappedResponse }],
      usage: { input_tokens: 300, output_tokens: 500 },
    } as CreateResult);

    const { result } = await draftColdOutreach(coldOutreachInputFixture);
    expect(result.variants).toHaveLength(2);
  });

  it("throws when both variants share the same approach", async () => {
    const originalSetTimeout = globalThis.setTimeout;
    vi.stubGlobal("setTimeout", (fn: (...args: unknown[]) => void) => {
      Promise.resolve().then(() => fn());
      return 0 as unknown as ReturnType<typeof setTimeout>;
    });

    mockCreate.mockResolvedValue({
      content: [
        { type: "text", text: JSON.stringify(duplicateApproachOutputFixture) },
      ],
      usage: { input_tokens: 300, output_tokens: 500 },
    } as CreateResult);

    await expect(draftColdOutreach(coldOutreachInputFixture)).rejects.toThrow(
      /direct.*value_first/
    );

    vi.stubGlobal("setTimeout", originalSetTimeout);
  });

  it("retries once on Claude API failure", async () => {
    const originalSetTimeout = globalThis.setTimeout;
    vi.stubGlobal("setTimeout", (fn: (...args: unknown[]) => void) => {
      Promise.resolve().then(() => fn());
      return 0 as unknown as ReturnType<typeof setTimeout>;
    });

    mockCreate
      .mockRejectedValueOnce(new Error("API overloaded"))
      .mockResolvedValue({
        content: [
          { type: "text", text: JSON.stringify(coldOutreachOutputFixture) },
        ],
        usage: { input_tokens: 300, output_tokens: 500 },
      } as CreateResult);

    const { result } = await draftColdOutreach(coldOutreachInputFixture);
    expect(result.variants).toHaveLength(2);
    expect(mockCreate).toHaveBeenCalledTimes(2);

    vi.stubGlobal("setTimeout", originalSetTimeout);
  });
});
