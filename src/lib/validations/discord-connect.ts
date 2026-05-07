/**
 * Discord Connect Validation - Zod schema for the bot-token connect form.
 *
 * Discord snowflake IDs are 17–20 digit integers; the regex catches obvious garbage.
 */

import { z } from "zod";

export const discordConnectSchema = z.object({
  botToken: z.string().min(20, "Bot token looks too short"),
  serverId: z.string().regex(/^\d{17,20}$/, "Invalid Discord server ID"),
  defaultChannelId: z
    .string()
    .regex(/^\d{17,20}$/, "Invalid Discord channel ID"),
});

export type DiscordConnectInput = z.infer<typeof discordConnectSchema>;
