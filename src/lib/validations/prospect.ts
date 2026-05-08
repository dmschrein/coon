import { z } from "zod";

// ============================================================================
// Outreach Prospect Validation Schemas
// ============================================================================

const HANDLE_MAX = 200;
const PLATFORM_MAX = 50;
const TAG_MAX = 50;
const TAGS_ARRAY_MAX = 20;
const NOTES_MAX = 2000;
const BULK_MAX = 500;

// --- Enum Values ---

export const prospectStatusValues = [
  "cold",
  "contacted",
  "responded",
  "joined",
  "declined",
] as const;
export type ProspectStatus = (typeof prospectStatusValues)[number];

export const prospectSourceValues = [
  "manual",
  "content_engagement",
  "import",
] as const;
export type ProspectSource = (typeof prospectSourceValues)[number];

// --- List Query ---

export const prospectListQuerySchema = z.object({
  status: z.enum(prospectStatusValues).optional(),
  platform: z.string().min(1).max(PLATFORM_MAX).optional(),
  source: z.enum(prospectSourceValues).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ProspectListQuery = z.infer<typeof prospectListQuerySchema>;

// --- Create Prospect ---

export const createProspectSchema = z.object({
  handle: z.string().min(1, "Handle is required").max(HANDLE_MAX),
  platform: z.string().min(1, "Platform is required").max(PLATFORM_MAX),
  source: z.enum(prospectSourceValues).optional(),
  notes: z.string().max(NOTES_MAX).optional(),
  tags: z.array(z.string().min(1).max(TAG_MAX)).max(TAGS_ARRAY_MAX).optional(),
  convertedFromContentId: z.string().uuid().optional(),
});

export type CreateProspect = z.infer<typeof createProspectSchema>;

// --- Update Prospect ---

export const updateProspectSchema = z
  .object({
    status: z.enum(prospectStatusValues).optional(),
    notes: z.string().max(NOTES_MAX).nullable().optional(),
    tags: z
      .array(z.string().min(1).max(TAG_MAX))
      .max(TAGS_ARRAY_MAX)
      .optional(),
    handle: z.string().min(1).max(HANDLE_MAX).optional(),
  })
  .refine(
    (data) =>
      data.status !== undefined ||
      data.notes !== undefined ||
      data.tags !== undefined ||
      data.handle !== undefined,
    { message: "At least one field must be provided" }
  );

export type UpdateProspect = z.infer<typeof updateProspectSchema>;

// --- Bulk Import ---

export const bulkImportSchema = z.object({
  handles: z
    .array(z.string().min(1).max(HANDLE_MAX))
    .min(1, "At least one handle is required")
    .max(BULK_MAX),
  platform: z.string().min(1).max(PLATFORM_MAX).optional(),
});

export type BulkImport = z.infer<typeof bulkImportSchema>;
