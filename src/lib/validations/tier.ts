import { z } from "zod";

// ============================================================================
// Membership Tier Validation Schemas
// ============================================================================

const NAME_MAX = 200;
const TAGLINE_MAX = 300;
const DESCRIPTION_MAX = 2000;
const URL_MAX = 500;
const BENEFIT_MAX = 300;
const BENEFITS_MAX_COUNT = 20;

// --- Enum Values ---

export const billingCycleValues = ["monthly", "yearly", "one_time"] as const;
export type BillingCycle = (typeof billingCycleValues)[number];

// --- Create Tier ---

export const tierCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(NAME_MAX),
  tagline: z.string().max(TAGLINE_MAX).optional(),
  description: z.string().max(DESCRIPTION_MAX).optional(),
  priceCents: z.number().int().min(0).optional(),
  billingCycle: z.enum(billingCycleValues).optional(),
  benefits: z
    .array(z.string().min(1).max(BENEFIT_MAX))
    .max(BENEFITS_MAX_COUNT)
    .optional(),
  externalPaymentUrl: z.string().max(URL_MAX).optional(),
});

export type TierCreate = z.infer<typeof tierCreateSchema>;

// --- Update Tier ---

export const tierUpdateSchema = z
  .object({
    name: z.string().min(1).max(NAME_MAX).optional(),
    tagline: z.string().max(TAGLINE_MAX).nullable().optional(),
    description: z.string().max(DESCRIPTION_MAX).nullable().optional(),
    priceCents: z.number().int().min(0).optional(),
    billingCycle: z.enum(billingCycleValues).optional(),
    benefits: z
      .array(z.string().min(1).max(BENEFIT_MAX))
      .max(BENEFITS_MAX_COUNT)
      .optional(),
    externalPaymentUrl: z.string().max(URL_MAX).nullable().optional(),
    memberCount: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export type TierUpdate = z.infer<typeof tierUpdateSchema>;

// --- Reorder ---

export const tierReorderSchema = z.object({
  orderedIds: z.array(z.string().uuid()).min(1),
});

// --- Copy Generation ---

export const tierCopyInputSchema = z.object({
  audienceSummary: z.string().min(1).max(2000),
  communityName: z.string().min(1).max(200),
  priceCents: z.number().int().min(0),
  billingCycle: z.enum(billingCycleValues),
  tierGoal: z.string().min(1).max(500),
});

export const tierCopyOutputSchema = z.object({
  name: z.string().min(1).max(NAME_MAX),
  tagline: z.string().min(1).max(TAGLINE_MAX),
  description: z.string().min(1).max(DESCRIPTION_MAX),
  benefits: z.array(z.string().min(1).max(BENEFIT_MAX)).min(5).max(8),
});

// --- API Shape ---
// Date fields come back as ISO strings after JSON serialization.
export interface MembershipTier {
  id: string;
  userId: string;
  name: string;
  tagline: string | null;
  description: string | null;
  priceCents: number;
  billingCycle: BillingCycle;
  benefits: string[];
  externalPaymentUrl: string | null;
  memberCount: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}
