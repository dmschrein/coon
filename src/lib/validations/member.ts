import { z } from "zod";

// ============================================================================
// Member (CRM) Validation Schemas
// ============================================================================

// --- Length caps ---
// Reasonable upper bounds to prevent abuse / pathological payloads.
const PLATFORM_MAX = 50;
const PLATFORM_USER_ID_MAX = 200;
const USERNAME_MAX = 200;
const DISPLAY_NAME_MAX = 200;
const TAG_MAX = 50;
const TAGS_ARRAY_MAX = 20;
const NOTES_MAX = 2000;

// --- Enum Values ---

export const memberStatusValues = ["prospect", "member", "advocate"] as const;

export type MemberStatus = (typeof memberStatusValues)[number];

// --- List Query ---

export const memberListQuerySchema = z.object({
  status: z.enum(memberStatusValues).optional(),
  platform: z.string().min(1).max(PLATFORM_MAX).optional(),
  minEngagement: z.coerce.number().int().min(0).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type MemberListQuery = z.infer<typeof memberListQuerySchema>;

// --- Create Member ---

export const createMemberSchema = z.object({
  platform: z.string().min(1, "Platform is required").max(PLATFORM_MAX),
  platformUserId: z
    .string()
    .min(1, "Platform user ID is required")
    .max(PLATFORM_USER_ID_MAX),
  username: z.string().min(1, "Username is required").max(USERNAME_MAX),
  displayName: z.string().max(DISPLAY_NAME_MAX).optional(),
});

export type CreateMember = z.infer<typeof createMemberSchema>;

// --- Update Member ---

export const updateMemberSchema = z
  .object({
    status: z.enum(memberStatusValues).optional(),
    tags: z
      .array(z.string().min(1).max(TAG_MAX))
      .max(TAGS_ARRAY_MAX)
      .optional(),
    notes: z.string().max(NOTES_MAX).nullable().optional(),
    displayName: z.string().max(DISPLAY_NAME_MAX).nullable().optional(),
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
