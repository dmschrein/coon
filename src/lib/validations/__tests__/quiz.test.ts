import { describe, it, expect } from "vitest";
import {
  productDefinitionSchema,
  targetCustomerSchema,
  competitiveLandscapeSchema,
  communityGoalsSchema,
  fullQuizSchema,
} from "../quiz";

describe("productDefinitionSchema", () => {
  const valid = {
    productType: "saas",
    elevatorPitch: "A tool that helps founders build communities",
    problemSolved: "Founders launch without an audience",
    uniqueAngle: "Uses AI to generate personas and strategies",
    currentStage: "mvp",
  };

  it("accepts valid product definition", () => {
    expect(() => productDefinitionSchema.parse(valid)).not.toThrow();
  });

  it("rejects invalid productType", () => {
    expect(() =>
      productDefinitionSchema.parse({ ...valid, productType: "invalid" })
    ).toThrow();
  });

  it("rejects short elevatorPitch", () => {
    expect(() =>
      productDefinitionSchema.parse({ ...valid, elevatorPitch: "Short" })
    ).toThrow(/at least 10/);
  });

  it("rejects elevatorPitch over 280 chars", () => {
    expect(() =>
      productDefinitionSchema.parse({
        ...valid,
        elevatorPitch: "A".repeat(281),
      })
    ).toThrow(/at most 280/);
  });

  it("accepts all valid product types", () => {
    for (const type of ["saas", "physical", "service", "content", "other"]) {
      expect(() =>
        productDefinitionSchema.parse({ ...valid, productType: type })
      ).not.toThrow();
    }
  });

  it("accepts all valid current stages", () => {
    for (const stage of ["idea", "mvp", "beta", "launched"]) {
      expect(() =>
        productDefinitionSchema.parse({ ...valid, currentStage: stage })
      ).not.toThrow();
    }
  });
});

describe("targetCustomerSchema", () => {
  const valid = {
    idealCustomer: "Solo founders building B2B SaaS products",
    industryNiche: ["SaaS"],
    customerPainPoints: ["No audience at launch"],
    currentSolutions: ["Manual posting"],
    budgetRange: "low",
    businessModel: "b2c",
  };

  it("accepts valid target customer", () => {
    expect(() => targetCustomerSchema.parse(valid)).not.toThrow();
  });

  it("rejects empty industryNiche", () => {
    expect(() =>
      targetCustomerSchema.parse({ ...valid, industryNiche: [] })
    ).toThrow(/at least one/i);
  });

  it("rejects empty customerPainPoints", () => {
    expect(() =>
      targetCustomerSchema.parse({ ...valid, customerPainPoints: [] })
    ).toThrow(/at least one/i);
  });

  it("allows empty currentSolutions", () => {
    expect(() =>
      targetCustomerSchema.parse({ ...valid, currentSolutions: [] })
    ).not.toThrow();
  });

  it("rejects invalid budgetRange", () => {
    expect(() =>
      targetCustomerSchema.parse({ ...valid, budgetRange: "unlimited" })
    ).toThrow();
  });

  it("accepts all valid business models", () => {
    for (const model of ["b2b", "b2c", "both"]) {
      expect(() =>
        targetCustomerSchema.parse({ ...valid, businessModel: model })
      ).not.toThrow();
    }
  });
});

describe("competitiveLandscapeSchema", () => {
  const valid = {
    competitors: [{ name: "Buffer" }],
    competitorStrengths: ["Large user base"],
    competitorWeaknesses: ["No AI features"],
    differentiators: ["AI-powered personas"],
  };

  it("accepts valid competitive landscape", () => {
    expect(() => competitiveLandscapeSchema.parse(valid)).not.toThrow();
  });

  it("allows empty competitors array", () => {
    expect(() =>
      competitiveLandscapeSchema.parse({ ...valid, competitors: [] })
    ).not.toThrow();
  });

  it("rejects empty differentiators", () => {
    expect(() =>
      competitiveLandscapeSchema.parse({ ...valid, differentiators: [] })
    ).toThrow(/at least one/i);
  });

  it("accepts competitors with optional fields", () => {
    expect(() =>
      competitiveLandscapeSchema.parse({
        ...valid,
        competitors: [
          { name: "Buffer", url: "https://buffer.com", notes: "Popular" },
        ],
      })
    ).not.toThrow();
  });
});

describe("communityGoalsSchema", () => {
  const valid = {
    launchTimeline: "2026-06-01T00:00:00.000Z",
    targetAudienceSize: 1000,
    weeklyTimeCommitment: 5,
    preferredPlatforms: ["twitter", "linkedin"],
    contentComfortLevel: "intermediate",
  };

  it("accepts valid community goals", () => {
    expect(() => communityGoalsSchema.parse(valid)).not.toThrow();
  });

  it("rejects non-ISO launchTimeline", () => {
    expect(() =>
      communityGoalsSchema.parse({ ...valid, launchTimeline: "next month" })
    ).toThrow();
  });

  it("rejects negative targetAudienceSize", () => {
    expect(() =>
      communityGoalsSchema.parse({ ...valid, targetAudienceSize: -1 })
    ).toThrow();
  });

  it("rejects zero weeklyTimeCommitment", () => {
    expect(() =>
      communityGoalsSchema.parse({ ...valid, weeklyTimeCommitment: 0 })
    ).toThrow();
  });

  it("rejects empty preferredPlatforms", () => {
    expect(() =>
      communityGoalsSchema.parse({ ...valid, preferredPlatforms: [] })
    ).toThrow(/at least one/i);
  });

  it("rejects invalid platform values", () => {
    expect(() =>
      communityGoalsSchema.parse({
        ...valid,
        preferredPlatforms: ["fakebook"],
      })
    ).toThrow();
  });

  it("accepts all valid content comfort levels", () => {
    for (const level of ["beginner", "intermediate", "advanced"]) {
      expect(() =>
        communityGoalsSchema.parse({ ...valid, contentComfortLevel: level })
      ).not.toThrow();
    }
  });
});

describe("fullQuizSchema", () => {
  it("accepts a complete valid quiz response", () => {
    const fullQuiz = {
      productType: "saas",
      elevatorPitch: "A tool that helps founders build communities",
      problemSolved: "Founders launch without an audience",
      uniqueAngle: "Uses AI to generate personas and strategies",
      currentStage: "mvp",
      idealCustomer: "Solo founders building B2B SaaS products",
      industryNiche: ["SaaS"],
      customerPainPoints: ["No audience at launch"],
      currentSolutions: [],
      budgetRange: "low",
      businessModel: "b2c",
      competitors: [],
      competitorStrengths: [],
      competitorWeaknesses: [],
      differentiators: ["AI personas"],
      launchTimeline: "2026-06-01T00:00:00.000Z",
      targetAudienceSize: 500,
      weeklyTimeCommitment: 3,
      preferredPlatforms: ["twitter"],
      contentComfortLevel: "beginner",
    };

    expect(() => fullQuizSchema.parse(fullQuiz)).not.toThrow();
  });

  it("rejects quiz missing required sections", () => {
    expect(() => fullQuizSchema.parse({ productType: "saas" })).toThrow();
  });
});
