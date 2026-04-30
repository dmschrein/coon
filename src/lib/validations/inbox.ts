import { z } from "zod";

// ============================================================================
// Inbox Validation Schemas
// ============================================================================

// --- Enum Values ---

export const messageTypeValues = ["comment", "reply", "mention", "dm"] as const;

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
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type InboxListQuery = z.infer<typeof inboxListQuerySchema>;

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
