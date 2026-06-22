import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateSponsorPitch } from "../sponsor-pitch";
import {
  sponsorPitchInputFixture,
  sponsorPitchOutputFixture,
  longSponsorPitchOutputFixture,
  missingCountSponsorPitchOutputFixture,
} from "../__fixtures__/sponsor-pitch";

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

describe("generateSponsorPitch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns subject, body, and followUp on a successful response", async () => {
    mockCreate.mockResolvedValue({
      content: [
        { type: "text", text: JSON.stringify(sponsorPitchOutputFixture) },
      ],
      usage: { input_tokens: 300, output_tokens: 500 },
    } as CreateResult);

    const { result } = await generateSponsorPitch(sponsorPitchInputFixture);

    expect(result.subject).toBeTruthy();
    expect(result.body).toBeTruthy();
    expect(result.followUp).toBeTruthy();
  });

  it("body is non-empty and under 300 words", async () => {
    mockCreate.mockResolvedValue({
      content: [
        { type: "text", text: JSON.stringify(sponsorPitchOutputFixture) },
      ],
      usage: { input_tokens: 300, output_tokens: 500 },
    } as CreateResult);

    const { result } = await generateSponsorPitch(sponsorPitchInputFixture);

    expect(result.body.length).toBeGreaterThan(0);
    const wordCount = result.body.trim().split(/\s+/).filter(Boolean).length;
    expect(wordCount).toBeLessThanOrEqual(300);
  });

  it("body contains the audience memberCount number", async () => {
    mockCreate.mockResolvedValue({
      content: [
        { type: "text", text: JSON.stringify(sponsorPitchOutputFixture) },
      ],
      usage: { input_tokens: 300, output_tokens: 500 },
    } as CreateResult);

    const { result } = await generateSponsorPitch(sponsorPitchInputFixture);

    expect(result.body).toContain(
      String(sponsorPitchInputFixture.audienceMetrics.memberCount)
    );
  });

  it("returns model and token metadata", async () => {
    mockCreate.mockResolvedValue({
      content: [
        { type: "text", text: JSON.stringify(sponsorPitchOutputFixture) },
      ],
      usage: { input_tokens: 300, output_tokens: 500 },
    } as CreateResult);

    const { modelUsed, tokensUsed } = await generateSponsorPitch(
      sponsorPitchInputFixture
    );

    expect(modelUsed).toBe("claude-sonnet-4-20250514");
    expect(tokensUsed).toBe(800);
  });

  it("calls Claude with the sponsorship pitch writer system prompt", async () => {
    mockCreate.mockResolvedValue({
      content: [
        { type: "text", text: JSON.stringify(sponsorPitchOutputFixture) },
      ],
      usage: { input_tokens: 300, output_tokens: 500 },
    } as CreateResult);

    await generateSponsorPitch(sponsorPitchInputFixture);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-sonnet-4-20250514",
        system: expect.stringMatching(/sponsorship pitch writer/i),
      })
    );
  });

  it("includes companyName, communityName, persona name, memberCount, and 300-word rule in the prompt", async () => {
    mockCreate.mockResolvedValue({
      content: [
        { type: "text", text: JSON.stringify(sponsorPitchOutputFixture) },
      ],
      usage: { input_tokens: 300, output_tokens: 500 },
    } as CreateResult);

    await generateSponsorPitch(sponsorPitchInputFixture);

    const callArgs = mockCreate.mock.calls[0][0];
    const userMessage = callArgs.messages[0].content as string;
    expect(userMessage).toContain("DevTools Inc");
    expect(userMessage).toContain("Indie Builders");
    expect(userMessage).toContain("Solo Founder");
    expect(userMessage).toContain("1247");
    expect(userMessage).toMatch(/300 words/i);
  });

  it("truncates body to 300 words when Claude over-returns", async () => {
    mockCreate.mockResolvedValue({
      content: [
        { type: "text", text: JSON.stringify(longSponsorPitchOutputFixture) },
      ],
      usage: { input_tokens: 300, output_tokens: 500 },
    } as CreateResult);

    const { result } = await generateSponsorPitch(sponsorPitchInputFixture);

    const wordCount = result.body.trim().split(/\s+/).filter(Boolean).length;
    expect(wordCount).toBeLessThanOrEqual(300);
  });

  it("throws when body is missing the memberCount number", async () => {
    const originalSetTimeout = globalThis.setTimeout;
    vi.stubGlobal("setTimeout", (fn: (...args: unknown[]) => void) => {
      Promise.resolve().then(() => fn());
      return 0 as unknown as ReturnType<typeof setTimeout>;
    });

    mockCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify(missingCountSponsorPitchOutputFixture),
        },
      ],
      usage: { input_tokens: 300, output_tokens: 500 },
    } as CreateResult);

    await expect(
      generateSponsorPitch(sponsorPitchInputFixture)
    ).rejects.toThrow(/1247/);

    vi.stubGlobal("setTimeout", originalSetTimeout);
  });

  it("extracts JSON from markdown code blocks", async () => {
    const wrapped = `Here's the pitch:\n\`\`\`json\n${JSON.stringify(sponsorPitchOutputFixture)}\n\`\`\``;
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: wrapped }],
      usage: { input_tokens: 300, output_tokens: 500 },
    } as CreateResult);

    const { result } = await generateSponsorPitch(sponsorPitchInputFixture);
    expect(result.subject).toBeTruthy();
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
          { type: "text", text: JSON.stringify(sponsorPitchOutputFixture) },
        ],
        usage: { input_tokens: 300, output_tokens: 500 },
      } as CreateResult);

    const { result } = await generateSponsorPitch(sponsorPitchInputFixture);
    expect(result.subject).toBeTruthy();
    expect(mockCreate).toHaveBeenCalledTimes(2);

    vi.stubGlobal("setTimeout", originalSetTimeout);
  });
});
