/**
 * Connected Account Validation - Zod schemas for social account management.
 */

import { z } from "zod";

export const socialPlatformValues = [
  "reddit",
  "instagram",
  "tiktok",
  "twitter",
  "youtube",
  "threads",
  "linkedin",
] as const;

export const socialPlatformSchema = z.enum(socialPlatformValues);
export type SocialPlatformValue = z.infer<typeof socialPlatformSchema>;

export const connectedAccountIdSchema = z.object({
  id: z.string().uuid("Invalid account ID"),
});
