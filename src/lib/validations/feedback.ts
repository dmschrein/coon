import { z } from "zod";

export const audienceProfileChangeSchema = z.object({
  field: z.string().min(1),
  oldValue: z.unknown(),
  newValue: z.unknown(),
  reason: z.string().min(1),
});

export const feedbackLoopOutputSchema = z.object({
  changes: z.array(audienceProfileChangeSchema),
  summary: z.string().min(1),
  confidence: z.number().min(0).max(1),
});
