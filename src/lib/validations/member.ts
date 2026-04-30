import { z } from "zod";

// ============================================================================
// Member (CRM) Validation Schemas
// ============================================================================

// --- Enum Values ---

export const memberStatusValues = ["prospect", "member", "advocate"] as const;

export type MemberStatus = (typeof memberStatusValues)[number];

// --- List Query ---

export const memberListQuerySchema = z.object({
  status: z.enum(memberStatusValues).optional(),
  platform: z.string().min(1).optional(),
  minEngagement: z.coerce.number().int().min(0).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type MemberListQuery = z.infer<typeof memberListQuerySchema>;

// --- Create Member ---

export const createMemberSchema = z.object({
  platform: z.string().min(1, "Platform is required"),
  platformUserId: z.string().min(1, "Platform user ID is required"),
  username: z.string().min(1, "Username is required"),
  displayName: z.string().optional(),
});

export type CreateMember = z.infer<typeof createMemberSchema>;

// --- Update Member ---

export const updateMemberSchema = z
  .object({
    status: z.enum(memberStatusValues).optional(),
    tags: z.array(z.string()).optional(),
    notes: z.string().nullable().optional(),
    displayName: z.string().nullable().optional(),
  })
  .refine(
    (data) =>
      data.status !== undefined ||
      data.tags !== undefined ||
      data.notes !== undefined ||
      data.displayName !== undefined,
    { message: "At least one field must be provided" }
  );

export type UpdateMember = z.infer<typeof updateMemberSchema>;
