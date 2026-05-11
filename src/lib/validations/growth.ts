import { z } from "zod";

export const growthMemberWeekSchema = z.object({
  week: z.string(),
  count: z.number().int().min(0),
});

export const growthTopContentSchema = z.object({
  title: z.string(),
  joins: z.number().int().min(0),
});

export const prospectStatusBucketSchema = z.object({
  cold: z.number().int().min(0),
  contacted: z.number().int().min(0),
  responded: z.number().int().min(0),
  joined: z.number().int().min(0),
});

export const growthSummarySchema = z.object({
  memberCountByWeek: z.array(growthMemberWeekSchema),
  newMembersThisWeek: z.number().int().min(0),
  newMembersLastWeek: z.number().int().min(0),
  topConvertingContent: z.array(growthTopContentSchema),
  topConvertingPlatform: z.string(),
  prospectsInPipeline: z.number().int().min(0),
  prospectConversionRate: z.number().min(0).max(100),
  prospectsByStatus: prospectStatusBucketSchema,
});

export type GrowthMemberWeek = z.infer<typeof growthMemberWeekSchema>;
export type GrowthTopContent = z.infer<typeof growthTopContentSchema>;
export type ProspectStatusBucket = z.infer<typeof prospectStatusBucketSchema>;
export type GrowthSummary = z.infer<typeof growthSummarySchema>;
