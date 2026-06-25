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
