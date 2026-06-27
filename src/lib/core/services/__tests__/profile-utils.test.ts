import { describe, it, expect } from "vitest";
import { setNestedField } from "../profile-utils";

describe("setNestedField", () => {
  it("sets a top-level field", () => {
    const obj: Record<string, unknown> = { keywords: ["a"] };
    setNestedField(obj, "keywords", ["b", "c"]);
    expect(obj.keywords).toEqual(["b", "c"]);
  });

  it("sets a nested field that already exists", () => {
    const obj: Record<string, unknown> = {
      brandVoice: { summary: "old", descriptors: [] },
    };
    setNestedField(obj, "brandVoice.summary", "new");
    expect((obj.brandVoice as Record<string, unknown>).summary).toBe("new");
  });

  it("sets a deeply nested field (3 levels)", () => {
    const obj: Record<string, unknown> = {
      demographics: { incomeRange: { min: 0 } },
    };
    setNestedField(obj, "demographics.incomeRange.min", 100);
    const demo = obj.demographics as Record<string, unknown>;
    expect((demo.incomeRange as Record<string, unknown>).min).toBe(100);
  });

  it("throws when top-level field is not whitelisted", () => {
    const obj: Record<string, unknown> = {};
    expect(() => setNestedField(obj, "notAllowed", 1)).toThrow(
      "Invalid field path: notAllowed"
    );
  });

  it("throws when top-level of a nested path is not whitelisted", () => {
    const obj: Record<string, unknown> = {};
    expect(() => setNestedField(obj, "bogus.child", 1)).toThrow(
      "Invalid field path: bogus.child"
    );
  });

  it("throws when traversing into a non-object intermediate", () => {
    const obj: Record<string, unknown> = { psychographics: "not-an-object" };
    expect(() => setNestedField(obj, "psychographics.values", ["x"])).toThrow(
      /Cannot traverse path: psychographics\.values/
    );
  });

  it("throws when traversing into a null intermediate", () => {
    const obj: Record<string, unknown> = { psychographics: null };
    expect(() => setNestedField(obj, "psychographics.values", ["x"])).toThrow(
      /stopped at psychographics/
    );
  });

  it("creates the leaf key when only the leaf is missing", () => {
    const obj: Record<string, unknown> = { psychographics: {} };
    setNestedField(obj, "psychographics.values", ["x"]);
    expect((obj.psychographics as Record<string, unknown>).values).toEqual([
      "x",
    ]);
  });
});
