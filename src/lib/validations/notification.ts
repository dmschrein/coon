import { z } from "zod";

export const notificationTypeValues = [
  "post_trending",
  "new_advocate",
] as const;

export const notificationListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export type NotificationListQuery = z.infer<typeof notificationListQuerySchema>;
