import { z } from "zod";

// ============================================================================
// Audience Profile Validation Schemas
// ============================================================================

// ----------------------------------------------------------------------------
// Persona Schema
// ----------------------------------------------------------------------------

export const personaSchema = z.object({
  name: z.string(),
  description: z.string(),
  painPoints: z.array(z.string()),
  goals: z.array(z.string()),
  objections: z.array(z.string()),
  messagingAngle: z.string(),
});

export type PersonaSchema = z.infer<typeof personaSchema>;

// ----------------------------------------------------------------------------
// Psychographics Schema
// ----------------------------------------------------------------------------

const psychographicsSchema = z.object({
  values: z.array(z.string()),
  motivations: z.array(z.string()),
  frustrations: z.array(z.string()),
  goals: z.array(z.string()),
});

// ----------------------------------------------------------------------------
// Demographics Schema
// ----------------------------------------------------------------------------

const demographicsSchema = z.object({
  ageRange: z.tuple([z.number(), z.number()]),
  locations: z.array(z.string()),
  jobTitles: z.array(z.string()),
  incomeRange: z.string().optional(),
});

// ----------------------------------------------------------------------------
// Behavioral Patterns Schema
// ----------------------------------------------------------------------------

const behavioralPatternsSchema = z.object({
  contentConsumption: z.array(z.string()),
  purchaseDrivers: z.array(z.string()),
  decisionMakingProcess: z.string(),
});

// ----------------------------------------------------------------------------
// Brand Voice Schema
// ----------------------------------------------------------------------------

const brandVoiceSchema = z.object({
  descriptors: z.array(z.string()).min(3).max(5),
  summary: z.string(),
});

// ----------------------------------------------------------------------------
// Content Pillar Item Schema
// ----------------------------------------------------------------------------

const contentPillarItemSchema = z.object({
  name: z.string(),
  percentage: z.number().min(0).max(100),
  description: z.string(),
});

// ----------------------------------------------------------------------------
// Full Audience Profile Schema
// ----------------------------------------------------------------------------

export const audienceProfileSchema = z.object({
  primaryPersonas: z
    .array(personaSchema)
    .min(1, "At least one persona is required"),
  psychographics: psychographicsSchema,
  demographics: demographicsSchema,
  behavioralPatterns: behavioralPatternsSchema,
  keywords: z.array(z.string()),
  hashtags: z.array(z.string()),
  brandVoice: brandVoiceSchema.optional(),
  contentPillars: z.array(contentPillarItemSchema).min(3).max(5).optional(),
});

export type AudienceProfileSchema = z.infer<typeof audienceProfileSchema>;
