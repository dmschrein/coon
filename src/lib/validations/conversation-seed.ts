import { z } from "zod";
import { campaignPlatformSchema } from "./campaign";

export const seedTypeSchema = z.enum([
  "question",
  "poll",
  "challenge",
  "hot_take",
]);

export const seedSchema = z.object({
  type: seedTypeSchema,
  text: z.string().min(1),
  follow_up: z.string().optional(),
  best_time: z.string().optional(),
  rationale: z.string().min(1),
});

export const conversationSeedsOutputSchema = z.object({
  seeds: z.array(seedSchema).min(1),
});

export const seedRequestSchema = z.object({
  platform: campaignPlatformSchema,
  count: z.number().int().min(1).max(20).optional().default(5),
});

export type SeedRequest = z.infer<typeof seedRequestSchema>;
export type ConversationSeed = z.infer<typeof seedSchema>;
export type ConversationSeedsOutput = z.infer<
  typeof conversationSeedsOutputSchema
>;
