import { z } from "zod";

export const activateRitualSchema = z.object({
  campaignId: z.string().uuid("Invalid campaign id"),
});

export type ActivateRitualInput = z.infer<typeof activateRitualSchema>;
