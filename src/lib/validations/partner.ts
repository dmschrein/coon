import { z } from "zod";

// ============================================================================
// Cross-Community Partner Validation Schemas
// ============================================================================

const NAME_MAX = 200;
const PLATFORM_MAX = 50;
const URL_MAX = 500;
const HANDLE_MAX = 200;
const IDEAS_MAX = 2000;
const NOTES_MAX = 2000;

// --- Enum Values ---

export const partnerStatusValues = ["prospect", "active", "inactive"] as const;
export type PartnerStatus = (typeof partnerStatusValues)[number];

// --- Create Partner ---

export const partnerCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(NAME_MAX),
  platform: z.string().min(1, "Platform is required").max(PLATFORM_MAX),
  url: z.string().max(URL_MAX).optional(),
  contactHandle: z.string().max(HANDLE_MAX).optional(),
  status: z.enum(partnerStatusValues).optional(),
  collaborationIdeas: z.string().max(IDEAS_MAX).optional(),
  notes: z.string().max(NOTES_MAX).optional(),
});

export type PartnerCreate = z.infer<typeof partnerCreateSchema>;

// --- Update Partner ---

export const partnerUpdateSchema = z
  .object({
    name: z.string().min(1).max(NAME_MAX).optional(),
    platform: z.string().min(1).max(PLATFORM_MAX).optional(),
    url: z.string().max(URL_MAX).nullable().optional(),
    contactHandle: z.string().max(HANDLE_MAX).nullable().optional(),
    status: z.enum(partnerStatusValues).optional(),
    collaborationIdeas: z.string().max(IDEAS_MAX).nullable().optional(),
    notes: z.string().max(NOTES_MAX).nullable().optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.platform !== undefined ||
      data.url !== undefined ||
      data.contactHandle !== undefined ||
      data.status !== undefined ||
      data.collaborationIdeas !== undefined ||
      data.notes !== undefined,
    { message: "At least one field must be provided" }
  );

export type PartnerUpdate = z.infer<typeof partnerUpdateSchema>;

// --- API Shape ---
// Date fields come back as ISO strings after JSON serialization.
export interface Partner {
  id: string;
  userId: string;
  name: string;
  platform: string;
  url: string | null;
  contactHandle: string | null;
  status: PartnerStatus;
  collaborationIdeas: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}
