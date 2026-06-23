import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateManifesto } from "../manifesto-generator";
import {
  manifestoInputFixture,
  manifestoOutputFixture,
} from "../__fixtures__/manifesto";

// Mock the claude client
vi.mock("@/lib/claude", () => ({
  anthropic: {
    messages: {
      create: vi.fn(),
    },
  },
}));

import { anthropic } from "@/lib/claude";
const mockCreate = vi.mocked(anthropic.messages.create);

function mockClaudeResponse(payload: unknown) {
  mockCreate.mockResolvedValue({
    content: [{ type: "text", text: JSON.stringify(payload) }],
    usage: { input_tokens: 400, output_tokens: 900 },
  } as Awaited<ReturnType<typeof anthropic.messages.create>>);
}

describe("generateManifesto", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns exactly 3 name suggestions", async () => {
    mockClaudeResponse(manifestoOutputFixture);
    const { manifesto } = await generateManifesto(manifestoInputFixture);
    expect(manifesto.nameSuggestions).toHaveLength(3);
  });

  it("returns exactly 5 values", async () => {
    mockClaudeResponse(manifestoOutputFixture);
    const { manifesto } = await generateManifesto(manifestoInputFixture);
    expect(manifesto.values).toHaveLength(5);
    expect(manifesto.values[0]).toHaveProperty("name");
    expect(manifesto.values[0]).toHaveProperty("description");
  });

  it("returns an invitationLetter between 150 and 250 words", async () => {
    mockClaudeResponse(manifestoOutputFixture);
    const { manifesto } = await generateManifesto(manifestoInputFixture);
    const wordCount = manifesto.invitationLetter
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;
    expect(wordCount).toBeGreaterThanOrEqual(150);
    expect(wordCount).toBeLessThanOrEqual(250);
  });

  it("returns a non-empty mission", async () => {
    mockClaudeResponse(manifestoOutputFixture);
    const { manifesto } = await generateManifesto(manifestoInputFixture);
    expect(manifesto.mission.trim().length).toBeGreaterThan(0);
  });

  it("returns a non-empty whoFor", async () => {
    mockClaudeResponse(manifestoOutputFixture);
    const { manifesto } = await generateManifesto(manifestoInputFixture);
    expect(manifesto.whoFor.trim().length).toBeGreaterThan(0);
  });

  it("returns a non-empty whoNotFor", async () => {
    mockClaudeResponse(manifestoOutputFixture);
    const { manifesto } = await generateManifesto(manifestoInputFixture);
    expect(manifesto.whoNotFor.trim().length).toBeGreaterThan(0);
  });

  it("reports the model used and tokens consumed", async () => {
    mockClaudeResponse(manifestoOutputFixture);
    const result = await generateManifesto(manifestoInputFixture);
    expect(result.modelUsed).toBe("claude-sonnet-4-6");
    expect(result.tokensUsed).toBe(1300);
  });

  it("throws when the model returns the wrong number of name suggestions", async () => {
    mockClaudeResponse({
      ...manifestoOutputFixture,
      nameSuggestions: ["Only", "Two"],
    });
    await expect(generateManifesto(manifestoInputFixture)).rejects.toThrow();
  });

  it("throws when the invitation letter is too short", async () => {
    mockClaudeResponse({
      ...manifestoOutputFixture,
      invitationLetter: "Too short to count as a real letter.",
    });
    await expect(generateManifesto(manifestoInputFixture)).rejects.toThrow();
  });
});
