import { z } from "zod";
import { platformValues } from "./content";

export const eventInputSchema = z.object({
  eventTitle: z.string().min(3).max(200),
  eventDescription: z.string().min(10).max(2000),
  platform: z.enum(platformValues),
  // Require an explicit timezone offset so server-side schedule math is unambiguous.
  eventDatetime: z.string().datetime({ offset: true }),
  eventRsvpUrl: z.string().url().optional(),
});

export type EventInput = z.infer<typeof eventInputSchema>;

export const eventPostTypeValues = [
  "announcement",
  "reminder",
  "day_of",
] as const;
export type EventPostType = (typeof eventPostTypeValues)[number];

export const eventAgentOutputSchema = z.object({
  posts: z
    .array(
      z.object({
        type: z.enum(eventPostTypeValues),
        text: z.string().min(1),
      })
    )
    .length(3),
});

export type EventAgentOutput = z.infer<typeof eventAgentOutputSchema>;
