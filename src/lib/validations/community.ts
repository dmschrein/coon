import { z } from "zod";

/** Count words by splitting on whitespace (matches the test's word-count rule). */
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export const INVITATION_MIN_WORDS = 150;
export const INVITATION_MAX_WORDS = 250;

export const manifestoValueSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
});

export const manifestoOutputSchema = z.object({
  nameSuggestions: z.array(z.string().min(1)).length(3),
  mission: z.string().min(1),
  whoFor: z.string().min(1),
  whoNotFor: z.string().min(1),
  values: z.array(manifestoValueSchema).length(5),
  invitationLetter: z.string().refine(
    (s) => {
      const words = countWords(s);
      return words >= INVITATION_MIN_WORDS && words <= INVITATION_MAX_WORDS;
    },
    {
      message: `invitationLetter must be between ${INVITATION_MIN_WORDS} and ${INVITATION_MAX_WORDS} words`,
    }
  ),
});

export type ManifestoOutputParsed = z.infer<typeof manifestoOutputSchema>;

/** Body schema for POST /api/community/manifesto */
export const manifestoSectionSchema = z.enum([
  "nameSuggestions",
  "mission",
  "whoFor",
  "whoNotFor",
  "values",
  "invitationLetter",
]);

export const manifestoRequestSchema = z.object({
  regenerate: z.boolean().optional(),
  section: manifestoSectionSchema.optional(),
});

export type ManifestoRequestInput = z.infer<typeof manifestoRequestSchema>;

// ============================================================================
// Platform Setup Guide Schemas
// ============================================================================

// --- Shared enum values ---

export const setupGuidePlatformValues = [
  "discord",
  "reddit",
  "slack",
  "circle",
  "whatsapp",
] as const;

export const setupGuidePlatformSchema = z.enum(setupGuidePlatformValues);

// --- Sub-schemas ---

export const setupGuideStepSchema = z.object({
  text: z.string().min(1),
  estimatedMinutes: z.number().int().positive(),
  // copyReady is a string when present, never an empty string. An empty or
  // whitespace-only value from the model collapses to `undefined` (omitted).
  copyReady: z
    .string()
    .optional()
    .transform((v) => (v && v.trim().length > 0 ? v : undefined)),
});

export const setupGuideSectionSchema = z.object({
  section: z.string().min(1),
  steps: z.array(setupGuideStepSchema).min(1),
});

/** What the agent's LLM call must produce. `estimatedTotalMinutes` is derived in code. */
export const setupGuideAgentOutputSchema = z.object({
  checklist: z.array(setupGuideSectionSchema).min(1),
  welcomeMessage: z.string().min(1),
});

export type SetupGuideAgentOutput = z.infer<typeof setupGuideAgentOutputSchema>;

/** Body schema for POST /api/community/setup-guide (generate / get-or-create) */
export const setupGuideRequestSchema = z.object({
  platform: setupGuidePlatformSchema,
});

export type SetupGuideRequestInput = z.infer<typeof setupGuideRequestSchema>;

/** Body schema for PATCH /api/community/setup-guide (persist checked steps) */
export const setupGuideProgressSchema = z.object({
  platform: setupGuidePlatformSchema,
  completedSteps: z.array(z.string()),
});

export type SetupGuideProgressInput = z.infer<typeof setupGuideProgressSchema>;
