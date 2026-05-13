import { z } from "zod";

// ============================================================================
// Sponsorship CRM Validation Schemas
// ============================================================================

const COMPANY_MAX = 200;
const NAME_MAX = 200;
const EMAIL_MAX = 320;
const DELIVERABLES_MAX = 2000;
const NOTES_MAX = 2000;
const SUBJECT_MAX = 200;
const PITCH_BODY_MAX = 4000;
const FOLLOWUP_MAX = 2000;

// --- Enum Values ---

export const sponsorStatusValues = [
  "outreach",
  "negotiating",
  "active",
  "completed",
  "declined",
] as const;
export type SponsorStatus = (typeof sponsorStatusValues)[number];

// --- List Query ---

export const sponsorListQuerySchema = z.object({
  status: z.enum(sponsorStatusValues).optional(),
});

// --- Create Sponsor ---

export const sponsorCreateSchema = z.object({
  companyName: z.string().min(1, "Company name is required").max(COMPANY_MAX),
  contactName: z.string().max(NAME_MAX).optional(),
  contactEmail: z.string().email().max(EMAIL_MAX).optional(),
  dealValue: z.number().int().min(0).optional(),
  status: z.enum(sponsorStatusValues).optional(),
  deliverables: z.string().max(DELIVERABLES_MAX).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  notes: z.string().max(NOTES_MAX).optional(),
});

export type SponsorCreate = z.infer<typeof sponsorCreateSchema>;

// --- Update Sponsor ---

export const sponsorUpdateSchema = z
  .object({
    companyName: z.string().min(1).max(COMPANY_MAX).optional(),
    contactName: z.string().max(NAME_MAX).nullable().optional(),
    contactEmail: z.string().email().max(EMAIL_MAX).nullable().optional(),
    dealValue: z.number().int().min(0).nullable().optional(),
    status: z.enum(sponsorStatusValues).optional(),
    deliverables: z.string().max(DELIVERABLES_MAX).nullable().optional(),
    startDate: z.coerce.date().nullable().optional(),
    endDate: z.coerce.date().nullable().optional(),
    notes: z.string().max(NOTES_MAX).nullable().optional(),
  })
  .refine(
    (data) =>
      data.companyName !== undefined ||
      data.contactName !== undefined ||
      data.contactEmail !== undefined ||
      data.dealValue !== undefined ||
      data.status !== undefined ||
      data.deliverables !== undefined ||
      data.startDate !== undefined ||
      data.endDate !== undefined ||
      data.notes !== undefined,
    { message: "At least one field must be provided" }
  );

export type SponsorUpdate = z.infer<typeof sponsorUpdateSchema>;

// --- Pitch Agent Output ---

export const sponsorPitchOutputSchema = z.object({
  subject: z.string().min(1).max(SUBJECT_MAX),
  body: z.string().min(1).max(PITCH_BODY_MAX),
  followUp: z.string().min(1).max(FOLLOWUP_MAX),
});

export type SponsorPitchOutput = z.infer<typeof sponsorPitchOutputSchema>;

// --- API Shape ---
// Date fields come back as ISO strings after JSON serialization.
export interface Sponsor {
  id: string;
  userId: string;
  companyName: string;
  contactName: string | null;
  contactEmail: string | null;
  dealValue: number | null;
  status: SponsorStatus;
  deliverables: string | null;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}
