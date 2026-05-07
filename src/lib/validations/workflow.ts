import { z } from "zod";

// ============================================================================
// Workflow Trigger Validation Schemas
// ============================================================================

const NAME_MAX = 200;
const TAG_MAX = 50;
const TEMPLATE_HINT_MAX = 500;
const NOTIFICATION_MESSAGE_MAX = 500;
const PLATFORM_MAX = 50;
const ACTIONS_MAX = 10;

// --- Event Types ---

export const workflowEventTypeValues = [
  "new_member",
  "member_engaged_10",
  "member_inactive_14d",
] as const;

export const workflowEventTypeSchema = z.enum(workflowEventTypeValues);

export type WorkflowEventType = (typeof workflowEventTypeValues)[number];

// --- Conditions ---

export const workflowConditionsSchema = z
  .object({
    minEngagement: z.number().int().min(0).optional(),
    platform: z.string().min(1).max(PLATFORM_MAX).optional(),
    requireTag: z.string().min(1).max(TAG_MAX).optional(),
  })
  .passthrough();

export type WorkflowConditions = z.infer<typeof workflowConditionsSchema>;

// --- Actions ---

export const workflowActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("create_inbox_draft"),
    templateHint: z.string().min(1).max(TEMPLATE_HINT_MAX),
  }),
  z.object({
    type: z.literal("apply_tag"),
    tag: z.string().min(1).max(TAG_MAX),
  }),
  z.object({
    type: z.literal("create_notification"),
    message: z.string().min(1).max(NOTIFICATION_MESSAGE_MAX),
  }),
]);

export type WorkflowAction = z.infer<typeof workflowActionSchema>;

export const workflowActionsSchema = z
  .array(workflowActionSchema)
  .min(1, "At least one action is required")
  .max(ACTIONS_MAX);

// --- Create / Update ---

export const createWorkflowSchema = z.object({
  name: z.string().min(1, "Name is required").max(NAME_MAX),
  eventType: workflowEventTypeSchema,
  conditions: workflowConditionsSchema.optional().default({}),
  actions: workflowActionsSchema,
  isActive: z.boolean().optional().default(true),
});

export type CreateWorkflow = z.infer<typeof createWorkflowSchema>;

export const updateWorkflowSchema = z
  .object({
    name: z.string().min(1).max(NAME_MAX).optional(),
    eventType: workflowEventTypeSchema.optional(),
    conditions: workflowConditionsSchema.optional(),
    actions: workflowActionsSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.eventType !== undefined ||
      data.conditions !== undefined ||
      data.actions !== undefined ||
      data.isActive !== undefined,
    { message: "At least one field must be provided" }
  );

export type UpdateWorkflow = z.infer<typeof updateWorkflowSchema>;

// --- Outreach Drafter Agent Contract ---

export const outreachToneValues = [
  "warm",
  "curious",
  "value-adding",
  "celebratory",
] as const;

export type OutreachTone = (typeof outreachToneValues)[number];

export const workflowOutreachInputSchema = z.object({
  triggerReason: z.string().min(1),
  memberHandle: z.string().min(1),
  platform: z.string().min(1),
  communityName: z.string().min(1),
  audienceProfile: z.string().nullable().optional(),
  templateHint: z.string().nullable().optional(),
});

export type WorkflowOutreachInput = z.infer<typeof workflowOutreachInputSchema>;

export const workflowOutreachOutputSchema = z.object({
  message: z.string().min(1),
  tone: z.enum(outreachToneValues),
});

export type WorkflowOutreachOutput = z.infer<
  typeof workflowOutreachOutputSchema
>;
