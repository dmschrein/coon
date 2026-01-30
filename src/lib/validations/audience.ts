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
});

export type AudienceProfileSchema = z.infer<typeof audienceProfileSchema>;
