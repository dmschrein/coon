import { CLAUDE_MODEL } from "@/lib/model";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateCommunityRules } from "../rules-generator";
import { rulesInputFixture, rulesOutputFixture } from "../__fixtures__/rules";
import type { RulesInput, RulesTone } from "@/types";

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
    usage: { input_tokens: 300, output_tokens: 800 },
  } as Awaited<ReturnType<typeof anthropic.messages.create>>);
}

/**
 * Build a tone-sensitive payload. `strict` tone uses hard enforcement language
 * ("immediately" / "will be"); `casual` stays soft. Used to verify the agent
 * actually threads `tone` into the prompt.
 */
function tonedPayload(tone: RulesTone) {
  const enforcement =
    tone === "strict"
      ? "Violations will be removed immediately."
      : "We'll gently remind you to adjust.";
  return {
    rules: rulesOutputFixture.rules.map((r) => ({ ...r, enforcement })),
  };
}

describe("generateCommunityRules", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns between 6 and 8 rules (inclusive)", async () => {
    mockClaudeResponse(rulesOutputFixture);
    const { rules } = await generateCommunityRules(rulesInputFixture);
    expect(rules.length).toBeGreaterThanOrEqual(6);
    expect(rules.length).toBeLessThanOrEqual(8);
  });

  it('has no rule title starting with "Don\'t" (case-insensitive)', async () => {
    mockClaudeResponse(rulesOutputFixture);
    const { rules } = await generateCommunityRules(rulesInputFixture);
    for (const rule of rules) {
      expect(rule.title.trim().toLowerCase().startsWith("don't")).toBe(false);
    }
  });

  it('has no rule title starting with "No " (case-insensitive)', async () => {
    mockClaudeResponse(rulesOutputFixture);
    const { rules } = await generateCommunityRules(rulesInputFixture);
    for (const rule of rules) {
      expect(rule.title.trim().toLowerCase().startsWith("no ")).toBe(false);
    }
  });

  it('has no rule title that is exactly "Be respectful" with no niche qualification', async () => {
    mockClaudeResponse(rulesOutputFixture);
    const { rules } = await generateCommunityRules(rulesInputFixture);
    for (const rule of rules) {
      expect(rule.title.trim().toLowerCase()).not.toBe("be respectful");
    }
  });

  it("gives every rule a non-empty exampleViolation", async () => {
    mockClaudeResponse(rulesOutputFixture);
    const { rules } = await generateCommunityRules(rulesInputFixture);
    for (const rule of rules) {
      expect(rule.exampleViolation.trim().length).toBeGreaterThan(0);
    }
  });

  it("reports the model used and tokens consumed", async () => {
    mockClaudeResponse(rulesOutputFixture);
    const result = await generateCommunityRules(rulesInputFixture);
    expect(result.modelUsed).toBe(CLAUDE_MODEL);
    expect(result.tokensUsed).toBe(1100);
  });

  it("includes the niche in the prompt", async () => {
    mockClaudeResponse(rulesOutputFixture);
    await generateCommunityRules(rulesInputFixture);
    const sent = mockCreate.mock.calls[0][0];
    const prompt = String(sent.messages[0].content);
    expect(prompt).toContain(rulesInputFixture.niche);
  });

  it("threads tone into the prompt — strict tone yields stronger enforcement language than casual", async () => {
    // The mock reads the prompt and produces enforcement language by tone,
    // so this asserts that `tone` actually reaches the model.
    mockCreate.mockImplementation((async (params: {
      messages: { content: string }[];
    }) => {
      const prompt = String(params.messages[0].content);
      const tone: RulesTone = /tone:\s*strict/i.test(prompt)
        ? "strict"
        : /tone:\s*casual/i.test(prompt)
          ? "casual"
          : "professional";
      return {
        content: [{ type: "text", text: JSON.stringify(tonedPayload(tone)) }],
        usage: { input_tokens: 300, output_tokens: 800 },
      };
    }) as unknown as Parameters<typeof mockCreate.mockImplementation>[0]);

    const strictInput: RulesInput = { ...rulesInputFixture, tone: "strict" };
    const casualInput: RulesInput = { ...rulesInputFixture, tone: "casual" };

    const { rules: strictRules } = await generateCommunityRules(strictInput);
    const { rules: casualRules } = await generateCommunityRules(casualInput);

    const strictText = strictRules.map((r) => r.enforcement).join(" ");
    const casualText = casualRules.map((r) => r.enforcement).join(" ");

    expect(/immediately|will be/i.test(strictText)).toBe(true);
    expect(/immediately|will be/i.test(casualText)).toBe(false);
  });

  it("throws when the model returns too few rules", async () => {
    mockClaudeResponse({ rules: rulesOutputFixture.rules.slice(0, 3) });
    await expect(generateCommunityRules(rulesInputFixture)).rejects.toThrow();
  });
});
