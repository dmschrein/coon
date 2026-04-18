import { createHash } from "crypto";
import { db } from "@/lib/db";
import { agentRuns } from "@/lib/db/schema";
import type { AgentType, AgentStatus } from "@/types";

export function extractJSON(text: string): unknown {
  // Try parsing the full text as JSON first
  try {
    return JSON.parse(text);
  } catch {
    // Try extracting JSON from markdown code blocks
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      try {
        return JSON.parse(codeBlockMatch[1].trim());
      } catch {
        // Fall through
      }
    }

    // Try finding the first { or [ and matching to its closing bracket
    const jsonStart = text.search(/[{[]/);
    if (jsonStart !== -1) {
      const bracket = text[jsonStart];
      const closingBracket = bracket === "{" ? "}" : "]";
      let depth = 0;
      for (let i = jsonStart; i < text.length; i++) {
        if (text[i] === bracket) depth++;
        if (text[i] === closingBracket) depth--;
        if (depth === 0) {
          try {
            return JSON.parse(text.slice(jsonStart, i + 1));
          } catch {
            break;
          }
        }
      }
    }

    throw new Error("Could not extract valid JSON from response");
  }
}

export async function logAgentRun(params: {
  userId: string;
  agentType: AgentType;
  inputData?: unknown;
  outputData?: unknown;
  modelUsed: string;
  tokensUsed?: number;
  durationMs: number;
  status: AgentStatus;
  errorMessage?: string;
}) {
  await db.insert(agentRuns).values({
    userId: params.userId,
    agentType: params.agentType,
    inputData: params.inputData,
    outputData: params.outputData,
    modelUsed: params.modelUsed,
    tokensUsed: params.tokensUsed,
    durationMs: params.durationMs,
    status: params.status,
    errorMessage: params.errorMessage,
  });
}

export function computeContentHash(
  bodies: { id: string; body: string | null }[]
): string {
  const sorted = [...bodies].sort((a, b) => a.id.localeCompare(b.id));
  const concatenated = sorted.map((b) => `${b.id}:${b.body ?? ""}`).join("|");
  return createHash("sha256").update(concatenated).digest("hex");
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 1
): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s...
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempt) * 1000)
        );
      }
    }
  }
  throw lastError;
}
