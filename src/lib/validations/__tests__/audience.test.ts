import { describe, it, expect } from "vitest";
import { audienceProfileSchema, personaSchema } from "../audience";
import { audienceProfileFixture } from "@/lib/agents/__fixtures__/audience";

describe("personaSchema", () => {
  const validPersona = audienceProfileFixture.primaryPersonas[0];

  it("accepts valid persona", () => {
    expect(() => personaSchema.parse(validPersona)).not.toThrow();
  });

  it("rejects missing name", () => {
    const { name: _name, ...noName } = validPersona;
    expect(() => personaSchema.parse(noName)).toThrow();
  });

  it("rejects missing painPoints", () => {
    const { painPoints: _painPoints, ...noPainPoints } = validPersona;
    expect(() => personaSchema.parse(noPainPoints)).toThrow();
  });

  it("accepts persona with empty arrays", () => {
    expect(() =>
      personaSchema.parse({
        ...validPersona,
        painPoints: [],
        goals: [],
        objections: [],
      })
    ).not.toThrow();
  });
});

describe("audienceProfileSchema", () => {
  it("accepts valid audience profile from fixture", () => {
    expect(() =>
      audienceProfileSchema.parse(audienceProfileFixture)
    ).not.toThrow();
  });

  it("rejects empty primaryPersonas", () => {
    expect(() =>
      audienceProfileSchema.parse({
        ...audienceProfileFixture,
        primaryPersonas: [],
      })
    ).toThrow(/at least one/i);
  });

  it("validates demographics ageRange as tuple", () => {
    expect(() =>
      audienceProfileSchema.parse({
        ...audienceProfileFixture,
        demographics: {
          ...audienceProfileFixture.demographics,
          ageRange: [25, 45],
        },
      })
    ).not.toThrow();
  });

  it("rejects invalid ageRange", () => {
    expect(() =>
      audienceProfileSchema.parse({
        ...audienceProfileFixture,
        demographics: {
          ...audienceProfileFixture.demographics,
          ageRange: [25], // tuple requires 2 elements
        },
      })
    ).toThrow();
  });

  it("allows optional incomeRange", () => {
    const { incomeRange: _incomeRange, ...demographicsNoIncome } =
      audienceProfileFixture.demographics;
    expect(() =>
      audienceProfileSchema.parse({
        ...audienceProfileFixture,
        demographics: demographicsNoIncome,
      })
    ).not.toThrow();
  });

  it("validates nested psychographics structure", () => {
    expect(() =>
      audienceProfileSchema.parse({
        ...audienceProfileFixture,
        psychographics: { values: [], motivations: [] }, // missing required fields
      })
    ).toThrow();
  });

  it("validates behavioralPatterns has required fields", () => {
    expect(() =>
      audienceProfileSchema.parse({
        ...audienceProfileFixture,
        behavioralPatterns: {
          contentConsumption: ["tweets"],
          purchaseDrivers: ["time savings"],
          // missing decisionMakingProcess
        },
      })
    ).toThrow();
  });
});
