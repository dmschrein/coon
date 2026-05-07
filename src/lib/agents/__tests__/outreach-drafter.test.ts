import { describe, it, expect, vi, beforeEach } from "vitest";
import { draftOutreach } from "../outreach-drafter";
import {
  outreachDraftFixture,
  outreachInputFixture,
  truncatedOutreachFixture,
} from "../__fixtures__/outreach-draft";

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

describe("draftOutreach", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns validated message and tone on successful response", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify(outreachDraftFixture) }],
      usage: { input_tokens: 200, output_tokens: 300 },
    } as Awaited<ReturnType<typeof anthropic.messages.create>>);

    const { result } = await draftOutreach(outreachInputFixture);

    expect(result.message).toBe(outreachDraftFixture.message);
    expect(result.tone).toBe("warm");
  });

  it("returns model and token metadata", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify(outreachDraftFixture) }],
      usage: { input_tokens: 200, output_tokens: 300 },
    } as Awaited<ReturnType<typeof anthropic.messages.create>>);

    const { modelUsed, tokensUsed } = await draftOutreach(outreachInputFixture);

    expect(modelUsed).toBe("claude-sonnet-4-20250514");
    expect(tokensUsed).toBe(500);
  });

  it("calls Claude with correct system prompt", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify(outreachDraftFixture) }],
      usage: { input_tokens: 200, output_tokens: 300 },
    } as Awaited<ReturnType<typeof anthropic.messages.create>>);

    await draftOutreach(outreachInputFixture);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-sonnet-4-20250514",
        system: expect.stringContaining("outreach"),
      })
    );
  });

  it("includes member handle, platform, community, and trigger reason in the prompt", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify(outreachDraftFixture) }],
      usage: { input_tokens: 200, output_tokens: 300 },
    } as Awaited<ReturnType<typeof anthropic.messages.create>>);

    await draftOutreach(outreachInputFixture);

    const callArgs = mockCreate.mock.calls[0][0];
    const userMessage = callArgs.messages[0].content as string;
    expect(userMessage).toContain("@new_friend");
    expect(userMessage).toContain("twitter");
    expect(userMessage).toContain("Indie Builders");
    expect(userMessage).toContain("new_member");
  });

  it("enforces platform character limits on the message", async () => {
    mockCreate.mockResolvedValue({
      content: [
        { type: "text", text: JSON.stringify(truncatedOutreachFixture) },
      ],
      usage: { input_tokens: 200, output_tokens: 300 },
    } as Awaited<ReturnType<typeof anthropic.messages.create>>);

    const { result } = await draftOutreach(outreachInputFixture);

    // Twitter limit is 280
    expect(result.message.length).toBeLessThanOrEqual(280);
  });

  it("extracts JSON from markdown code blocks", async () => {
    const wrappedResponse = `Here is the draft:\n\`\`\`json\n${JSON.stringify(outreachDraftFixture)}\n\`\`\``;

    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: wrappedResponse }],
      usage: { input_tokens: 200, output_tokens: 300 },
    } as Awaited<ReturnType<typeof anthropic.messages.create>>);

    const { result } = await draftOutreach(outreachInputFixture);
    expect(result.message).toBe(outreachDraftFixture.message);
    expect(result.tone).toBe("warm");
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
        content: [{ type: "text", text: JSON.stringify(outreachDraftFixture) }],
        usage: { input_tokens: 200, output_tokens: 300 },
      } as Awaited<ReturnType<typeof anthropic.messages.create>>);

    const { result } = await draftOutreach(outreachInputFixture);
    expect(result.message).toBe(outreachDraftFixture.message);
    expect(mockCreate).toHaveBeenCalledTimes(2);

    vi.stubGlobal("setTimeout", originalSetTimeout);
  });

  it("uses correct char limit for non-twitter platforms", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify(outreachDraftFixture) }],
      usage: { input_tokens: 200, output_tokens: 300 },
    } as Awaited<ReturnType<typeof anthropic.messages.create>>);

    await draftOutreach({
      ...outreachInputFixture,
      platform: "linkedin",
    });

    const callArgs = mockCreate.mock.calls[0][0];
    const userMessage = callArgs.messages[0].content as string;
    expect(userMessage).toContain("2200");
  });
});
