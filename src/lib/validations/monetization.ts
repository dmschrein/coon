import { z } from "zod";
import { monetizationModelValues } from "@/types";

export const monetizationConfigSchema = z.object({
  selectedModels: z.array(z.enum(monetizationModelValues)),
  completedAt: z.string().datetime(),
});

export type MonetizationConfigInput = z.infer<typeof monetizationConfigSchema>;
