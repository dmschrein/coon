import { z } from "zod";
import {
  ONBOARDING_CHANNELS,
  ONBOARDING_TIMINGS,
} from "@/lib/core/domain/onboarding-schedule";

export const onboardingChannelSchema = z.enum(ONBOARDING_CHANNELS);
export const onboardingTimingSchema = z.enum(ONBOARDING_TIMINGS);

/**
 * Raw per-step shape returned by the model. Trigger timing and step number are
 * assigned by the agent (canonical order), not the model — so the draft only
 * carries channel + subject + content.
 */
export const onboardingStepDraftSchema = z
  .object({
    channel: onboardingChannelSchema.default("email"),
    subject: z.string().nullable().optional(),
    content: z.string().min(1),
  })
  .refine(
    (s) =>
      s.channel !== "email" || (!!s.subject && s.subject.trim().length > 0),
    { message: "Email steps require a subject", path: ["subject"] }
  );

export const onboardingSequenceDraftSchema = z.object({
  steps: z.array(onboardingStepDraftSchema).length(5),
});

/** A fully-assigned step as persisted via PATCH (manual edits / reorder). */
export const onboardingStepSaveSchema = z
  .object({
    stepNumber: z.number().int().min(1).max(5),
    triggerTiming: onboardingTimingSchema,
    channel: onboardingChannelSchema,
    subject: z.string().nullable().optional(),
    content: z.string().min(1),
  })
  .refine(
    (s) =>
      s.channel !== "email" || (!!s.subject && s.subject.trim().length > 0),
    { message: "Email steps require a subject", path: ["subject"] }
  );

/** Body for PATCH /api/community/onboarding — persist edited / reordered steps. */
export const onboardingSaveRequestSchema = z.object({
  steps: z.array(onboardingStepSaveSchema).min(1).max(5),
});

/** Body for POST /api/community/onboarding/generate (all optional). */
export const onboardingGenerateRequestSchema = z
  .object({
    communityName: z.string().optional(),
    productPitch: z.string().optional(),
  })
  .default({});

export type OnboardingStepDraft = z.infer<typeof onboardingStepDraftSchema>;
export type OnboardingSequenceDraft = z.infer<
  typeof onboardingSequenceDraftSchema
>;
export type OnboardingGenerateRequest = z.infer<
  typeof onboardingGenerateRequestSchema
>;
export type OnboardingSaveRequest = z.infer<typeof onboardingSaveRequestSchema>;
