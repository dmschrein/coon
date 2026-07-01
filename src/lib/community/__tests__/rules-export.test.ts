import { describe, it, expect } from "vitest";
import { rulesToMarkdown, rulesToPlainText } from "../rules-export";
import { rulesOutputFixture } from "@/lib/agents/__fixtures__/rules";

const rules = rulesOutputFixture.rules;

describe("rulesToMarkdown", () => {
  it("formats every rule title as a `## {title}` heading", () => {
    const md = rulesToMarkdown("Pixel Forge", rules);
    for (const rule of rules) {
      expect(md).toContain(`## ${rule.title}`);
    }
  });

  it("includes every description and example violation", () => {
    const md = rulesToMarkdown("Pixel Forge", rules);
    for (const rule of rules) {
      expect(md).toContain(rule.description);
      expect(md).toContain(rule.exampleViolation);
    }
  });

  it("uses the community name as the top-level heading", () => {
    const md = rulesToMarkdown("Pixel Forge", rules);
    expect(md).toContain("# Pixel Forge");
  });
});

describe("rulesToPlainText", () => {
  it("contains all rule titles", () => {
    const txt = rulesToPlainText("Pixel Forge", rules);
    for (const rule of rules) {
      expect(txt).toContain(rule.title);
    }
  });

  it("numbers the rules in order", () => {
    const txt = rulesToPlainText("Pixel Forge", rules);
    expect(txt).toContain(`1. ${rules[0].title}`);
    expect(txt).toContain(`2. ${rules[1].title}`);
  });
});
