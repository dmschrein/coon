import { z } from "zod";

// ============================================================================
// Engagement Validation Schemas
// ============================================================================

// --- Post Engagement ---

export const insertPostEngagementSchema = z.object({
  campaignContentId: z.string().uuid("Invalid campaign content ID"),
  platform: z.string().min(1, "Platform is required"),
  platformPostId: z.string().min(1, "Platform post ID is required"),
  likes: z.number().int().min(0).default(0),
  comments: z.number().int().min(0).default(0),
  shares: z.number().int().min(0).default(0),
  reach: z.number().int().min(0).default(0),
  impressions: z.number().int().min(0).default(0),
  engagementRate: z.string().optional(),
  recordedAt: z.coerce.date(),
});

export type InsertPostEngagement = z.infer<typeof insertPostEngagementSchema>;

export const updatePostEngagementSchema = z.object({
  likes: z.number().int().min(0).optional(),
  comments: z.number().int().min(0).optional(),
  shares: z.number().int().min(0).optional(),
  reach: z.number().int().min(0).optional(),
  impressions: z.number().int().min(0).optional(),
  engagementRate: z.string().optional(),
  recordedAt: z.coerce.date().optional(),
});

export type UpdatePostEngagement = z.infer<typeof updatePostEngagementSchema>;

// --- Platform Member ---

export const insertPlatformMemberSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  platform: z.string().min(1, "Platform is required"),
  platformUserId: z.string().min(1, "Platform user ID is required"),
  username: z.string().min(1, "Username is required"),
  displayName: z.string().optional(),
});

export type InsertPlatformMember = z.infer<typeof insertPlatformMemberSchema>;
