import type { CommunityRule } from "@/types";

/** Pure formatters for exporting community rules. No DOM or framework deps. */

export function rulesToMarkdown(
  communityName: string,
  rules: CommunityRule[]
): string {
  const title = communityName.trim() || "Community Rules";
  const lines: string[] = [`# ${title}`, ""];

  rules.forEach((rule) => {
    lines.push(`## ${rule.title}`, "");
    lines.push(rule.description, "");
    if (rule.exampleViolation.trim()) {
      lines.push(`**Example violation:** ${rule.exampleViolation}`, "");
    }
    if (rule.enforcement.trim()) {
      lines.push(`**Enforcement:** ${rule.enforcement}`, "");
    }
  });

  return lines.join("\n");
}

export function rulesToPlainText(
  communityName: string,
  rules: CommunityRule[]
): string {
  const title = communityName.trim() || "Community Rules";
  const lines: string[] = [title, "=".repeat(title.length), ""];

  rules.forEach((rule, i) => {
    lines.push(`${i + 1}. ${rule.title}`);
    lines.push(`   ${rule.description}`);
    if (rule.exampleViolation.trim()) {
      lines.push(`   Example violation: ${rule.exampleViolation}`);
    }
    if (rule.enforcement.trim()) {
      lines.push(`   Enforcement: ${rule.enforcement}`);
    }
    lines.push("");
  });

  return lines.join("\n");
}
