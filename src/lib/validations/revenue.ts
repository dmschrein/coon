import { z } from "zod";

const SOURCE_MAX = 200;
const NOTES_MAX = 2000;

export const revenueTypeValues = [
  "sponsorship",
  "membership",
  "course",
  "event",
  "other",
] as const;
export type RevenueType = (typeof revenueTypeValues)[number];

export const revenueCreateSchema = z.object({
  date: z.coerce.date(),
  source: z.string().max(SOURCE_MAX).nullable().optional(),
  type: z.enum(revenueTypeValues),
  amountCents: z.number().int().min(0),
  notes: z.string().max(NOTES_MAX).nullable().optional(),
});
export type RevenueCreate = z.infer<typeof revenueCreateSchema>;

export const revenueUpdateSchema = z
  .object({
    date: z.coerce.date().optional(),
    source: z.string().max(SOURCE_MAX).nullable().optional(),
    type: z.enum(revenueTypeValues).optional(),
    amountCents: z.number().int().min(0).optional(),
    notes: z.string().max(NOTES_MAX).nullable().optional(),
  })
  .refine(
    (d) =>
      d.date !== undefined ||
      d.source !== undefined ||
      d.type !== undefined ||
      d.amountCents !== undefined ||
      d.notes !== undefined,
    { message: "At least one field must be provided" }
  );
export type RevenueUpdate = z.infer<typeof revenueUpdateSchema>;

// API shape — dates serialized as ISO strings.
export interface RevenueEntry {
  id: string;
  userId: string;
  date: string;
  source: string | null;
  type: RevenueType;
  amountCents: number;
  notes: string | null;
  createdAt: string;
}

export interface MRRSummary {
  thisMonth: number;
  lastMonth: number;
  byType: Record<string, number>;
  monthlyTotals: { month: string; total: number }[];
}
