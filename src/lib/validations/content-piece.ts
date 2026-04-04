import { z } from "zod";

export const contentPieceOutputSchema = z.object({
  body: z.string().min(1),
  hashtags: z.array(z.string()),
  mediaSuggestions: z.array(
    z.object({
      type: z.string(),
      description: z.string(),
    })
  ),
  confidenceScore: z.number().min(0).max(1),
  targetCommunity: z.string(),
});

export type ContentPieceOutput = z.infer<typeof contentPieceOutputSchema>;
