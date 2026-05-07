import { z } from "zod";

// ============================================================================
// Inbox Validation Schemas
// ============================================================================

// --- Enum Values ---

export const messageTypeValues = [
  "comment",
  "reply",
  "mention",
  "dm",
  "draft",
] as const;

export const inboxStatusValues = ["unread", "read", "replied"] as const;

// --- Create Inbox Item ---

export const createInboxItemSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  campaignId: z.string().uuid("Invalid campaign ID").nullable().optional(),
  contentId: z.string().uuid("Invalid content ID").nullable().optional(),
  platform: z.string().min(1, "Platform is required"),
  authorHandle: z.string().min(1, "Author handle is required"),
  authorDisplayName: z.string().optional(),
  messageText: z.string().min(1, "Message text is required"),
  messageType: z.enum(messageTypeValues),
  platformMessageId: z.string().min(1, "Platform message ID is required"),
  receivedAt: z.coerce.date(),
});

export type CreateInboxItem = z.infer<typeof createInboxItemSchema>;

// --- Update Inbox Status ---

export const updateInboxStatusSchema = z.object({
  status: z.enum(inboxStatusValues),
});

export type UpdateInboxStatus = z.infer<typeof updateInboxStatusSchema>;

// --- List Query ---

export const inboxListQuerySchema = z.object({
  status: z.enum(inboxStatusValues).optional(),
  platform: z.string().optional(),
  campaignId: z.string().uuid("Invalid campaign ID").optional(),
  flagged: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type InboxListQuery = z.infer<typeof inboxListQuerySchema>;

// --- Moderation ---

export const moderationCategoryValues = [
  "spam",
  "toxicity",
  "off-topic",
  "self-promotion",
] as const;

export const moderationActionValues = [
  "approve",
  "hide",
  "block_sender",
] as const;

export const moderationCheckerInputSchema = z.object({
  messageText: z.string().min(1, "Message text is required"),
  authorHandle: z.string().min(1, "Author handle is required"),
  platform: z.string().min(1, "Platform is required"),
});

export type ModerationCheckerInput = z.infer<
  typeof moderationCheckerInputSchema
>;

export const moderationCheckerOutputSchema = z.object({
  flagged: z.boolean(),
  reason: z.string().optional(),
  confidence: z.number().min(0).max(1),
  category: z.enum(moderationCategoryValues).optional(),
});

export type ModerationCheckerOutput = z.infer<
  typeof moderationCheckerOutputSchema
>;

export const moderationActionSchema = z.object({
  action: z.enum(moderationActionValues),
});

export type ModerationAction = z.infer<typeof moderationActionSchema>;

// --- Reply Draft ---

export const replyDraftItemSchema = z.object({
  text: z.string().min(1),
  tone: z.string().min(1),
  rationale: z.string().min(1),
});

export const replyDraftOutputSchema = z.object({
  drafts: z.array(replyDraftItemSchema).min(2).max(3),
});

export type ReplyDraftOutput = z.infer<typeof replyDraftOutputSchema>;
