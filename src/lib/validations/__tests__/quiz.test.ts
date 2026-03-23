import { describe, it, expect } from "vitest";
import {
  yourProductSchema,
  yourAudienceSchema,
  yourGoalsSchema,
  fullQuizSchema,
} from "../quiz";

describe("yourProductSchema", () => {
  const valid = {
    productType: "saas",
    elevatorPitch: "A tool that helps founders build communities",
    problemSolved: "Founders launch without an audience",
    currentStage: "mvp",
  };

  it("accepts valid product definition", () => {
    expect(() => yourProductSchema.parse(valid)).not.toThrow();
  });

  it("rejects invalid productType", () => {
    expect(() =>
      yourProductSchema.parse({ ...valid, productType: "invalid" })
    ).toThrow();
  });

  it("rejects short elevatorPitch", () => {
    expect(() =>
      yourProductSchema.parse({ ...valid, elevatorPitch: "Short" })
    ).toThrow(/at least 10/);
  });

  it("rejects elevatorPitch over 280 chars", () => {
    expect(() =>
      yourProductSchema.parse({
        ...valid,
        elevatorPitch: "A".repeat(281),
      })
    ).toThrow(/at most 280/);
  });

  it("accepts all valid product types", () => {
    for (const type of ["saas", "physical", "service", "content", "other"]) {
      expect(() =>
        yourProductSchema.parse({ ...valid, productType: type })
      ).not.toThrow();
    }
  });

  it("accepts all valid current stages", () => {
    for (const stage of ["idea", "mvp", "beta", "launched"]) {
      expect(() =>
        yourProductSchema.parse({ ...valid, currentStage: stage })
      ).not.toThrow();
    }
  });
});

describe("yourAudienceSchema", () => {
  const valid = {
    idealCustomer: "Solo founders building B2B SaaS products",
    industryNiche: ["SaaS"],
    preferredPlatforms: ["twitter", "linkedin"],
    businessModel: "b2c",
    budgetRange: "low",
  };

  it("accepts valid audience definition", () => {
    expect(() => yourAudienceSchema.parse(valid)).not.toThrow();
  });

  it("rejects empty industryNiche", () => {
    expect(() =>
      yourAudienceSchema.parse({ ...valid, industryNiche: [] })
    ).toThrow(/at least one/i);
  });

  it("rejects empty preferredPlatforms", () => {
    expect(() =>
      yourAudienceSchema.parse({ ...valid, preferredPlatforms: [] })
    ).toThrow(/at least one/i);
  });

  it("rejects invalid budgetRange", () => {
    expect(() =>
      yourAudienceSchema.parse({ ...valid, budgetRange: "unlimited" })
    ).toThrow();
  });

  it("accepts all valid business models", () => {
    for (const model of ["b2b", "b2c", "both"]) {
      expect(() =>
        yourAudienceSchema.parse({ ...valid, businessModel: model })
      ).not.toThrow();
    }
  });

  it("rejects invalid platform values", () => {
    expect(() =>
      yourAudienceSchema.parse({
        ...valid,
        preferredPlatforms: ["fakebook"],
      })
    ).toThrow();
  });
});

describe("yourGoalsSchema", () => {
  const valid = {
    primaryGoal: "pre-launch",
    launchTimeline: "2026-06-01T00:00:00.000Z",
    weeklyTimeCommitment: 5,
    contentComfortLevel: "intermediate",
  };

  it("accepts valid goals", () => {
    expect(() => yourGoalsSchema.parse(valid)).not.toThrow();
  });

  it("rejects non-ISO launchTimeline", () => {
    expect(() =>
      yourGoalsSchema.parse({ ...valid, launchTimeline: "next month" })
    ).toThrow();
  });

  it("rejects zero weeklyTimeCommitment", () => {
    expect(() =>
      yourGoalsSchema.parse({ ...valid, weeklyTimeCommitment: 0 })
    ).toThrow();
  });

  it("rejects weeklyTimeCommitment over 20", () => {
    expect(() =>
      yourGoalsSchema.parse({ ...valid, weeklyTimeCommitment: 21 })
    ).toThrow();
  });

  it("accepts all valid primary goals", () => {
    for (const goal of [
      "pre-launch",
      "grow-existing",
      "promote-product",
      "thought-leadership",
    ]) {
      expect(() =>
        yourGoalsSchema.parse({ ...valid, primaryGoal: goal })
      ).not.toThrow();
    }
  });

  it("accepts all valid content comfort levels", () => {
    for (const level of ["beginner", "intermediate", "advanced"]) {
      expect(() =>
        yourGoalsSchema.parse({ ...valid, contentComfortLevel: level })
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
      currentStage: "mvp",
      idealCustomer: "Solo founders building B2B SaaS products",
      industryNiche: ["SaaS"],
      preferredPlatforms: ["twitter"],
      businessModel: "b2c",
      budgetRange: "low",
      primaryGoal: "pre-launch",
      launchTimeline: "2026-06-01T00:00:00.000Z",
      weeklyTimeCommitment: 3,
      contentComfortLevel: "beginner",
    };

    expect(() => fullQuizSchema.parse(fullQuiz)).not.toThrow();
  });

  it("rejects quiz missing required sections", () => {
    expect(() => fullQuizSchema.parse({ productType: "saas" })).toThrow();
  });
});
