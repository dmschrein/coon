import { z } from "zod";
import { monetizationModelValues } from "@/types";

export const monetizationConfigSchema = z.object({
  selectedModels: z.array(z.enum(monetizationModelValues)),
  completedAt: z.string().datetime(),
});

export type MonetizationConfigInput = z.infer<typeof monetizationConfigSchema>;

export const modelReadinessSchema = z.object({
  name: z.enum(monetizationModelValues),
  score: z.number().int().min(0).max(100),
  benchmark: z.string().min(1),
  topActions: z.array(z.string()).max(3),
  readyToLaunch: z.boolean(),
});

export const readinessOutputSchema = z.object({
  models: z.array(modelReadinessSchema),
  overallScore: z.number().min(0).max(100),
  summary: z.string().min(1),
});

export type ModelReadinessParsed = z.infer<typeof modelReadinessSchema>;
export type ReadinessOutputParsed = z.infer<typeof readinessOutputSchema>;
