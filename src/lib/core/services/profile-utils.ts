const VALID_TOP_LEVEL_FIELDS = new Set([
  "primaryPersonas",
  "psychographics",
  "demographics",
  "behavioralPatterns",
  "keywords",
  "hashtags",
  "brandVoice",
  "contentPillars",
]);

export function setNestedField(
  obj: Record<string, unknown>,
  path: string,
  value: unknown
): void {
  const parts = path.split(".");
  if (!VALID_TOP_LEVEL_FIELDS.has(parts[0])) {
    throw new Error(`Invalid field path: ${path}`);
  }

  if (parts.length === 1) {
    obj[parts[0]] = value;
    return;
  }

  let current = obj as Record<string, unknown>;
  for (let i = 0; i < parts.length - 1; i++) {
    const next = current[parts[i]];
    if (typeof next !== "object" || next === null) {
      throw new Error(`Cannot traverse path: ${path} (stopped at ${parts[i]})`);
    }
    current = next as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = value;
}
