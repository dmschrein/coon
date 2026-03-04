import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { extractJSON, withRetry } from "../utils";

// Mock the db module to prevent actual database connections
vi.mock("@/lib/db", () => ({
  db: { insert: vi.fn().mockReturnValue({ values: vi.fn() }) },
}));

vi.mock("@/lib/db/schema", () => ({
  agentRuns: {},
}));

describe("extractJSON", () => {
  it("parses raw JSON objects", () => {
    const input = '{"name": "test", "value": 42}';
    expect(extractJSON(input)).toEqual({ name: "test", value: 42 });
  });

  it("parses raw JSON arrays", () => {
    const input = "[1, 2, 3]";
    expect(extractJSON(input)).toEqual([1, 2, 3]);
  });

  it("extracts JSON from markdown code blocks with json tag", () => {
    const input = 'Here is the result:\n```json\n{"key": "value"}\n```\nDone.';
    expect(extractJSON(input)).toEqual({ key: "value" });
  });

  it("extracts JSON from markdown code blocks without json tag", () => {
    const input = 'Result:\n```\n{"key": "value"}\n```';
    expect(extractJSON(input)).toEqual({ key: "value" });
  });

  it("extracts JSON embedded in surrounding text", () => {
    const input =
      'Here is my analysis:\n\n{"personas": ["Alice", "Bob"]}\n\nHope that helps!';
    expect(extractJSON(input)).toEqual({ personas: ["Alice", "Bob"] });
  });

  it("extracts JSON arrays embedded in text", () => {
    const input = "The results are: [1, 2, 3] as expected.";
    expect(extractJSON(input)).toEqual([1, 2, 3]);
  });

  it("handles nested JSON objects", () => {
    const input = JSON.stringify({
      outer: { inner: { deep: "value" } },
      array: [{ nested: true }],
    });
    const result = extractJSON(input) as Record<string, unknown>;
    expect(result).toHaveProperty("outer.inner.deep", "value");
  });

  it("throws on invalid JSON with no extractable content", () => {
    expect(() => extractJSON("no json here at all")).toThrow(
      "Could not extract valid JSON from response"
    );
  });

  it("throws on empty string", () => {
    expect(() => extractJSON("")).toThrow(
      "Could not extract valid JSON from response"
    );
  });

  it("handles JSON with escaped characters", () => {
    const input = '{"message": "Hello \\"world\\""}';
    expect(extractJSON(input)).toEqual({ message: 'Hello "world"' });
  });
});

describe("withRetry", () => {
  let originalSetTimeout: typeof globalThis.setTimeout;
  let recordedDelays: number[];

  beforeEach(() => {
    recordedDelays = [];
    originalSetTimeout = globalThis.setTimeout;
    // Replace setTimeout to execute callbacks immediately and record delay values
    vi.stubGlobal(
      "setTimeout",
      (fn: (...args: unknown[]) => void, delay?: number) => {
        recordedDelays.push(delay ?? 0);
        // Schedule on the microtask queue so the caller's code continues
        Promise.resolve().then(() => fn());
        return 0 as unknown as ReturnType<typeof setTimeout>;
      }
    );
  });

  afterEach(() => {
    vi.stubGlobal("setTimeout", originalSetTimeout);
  });

  it("returns result on first successful attempt", async () => {
    const fn = vi.fn().mockResolvedValue("success");
    const result = await withRetry(fn);
    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on failure and succeeds on second attempt", async () => {
    let callCount = 0;
    const fn = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount === 1) throw new Error("fail");
      return "success";
    });

    const result = await withRetry(fn, 1);
    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("throws last error after exhausting all retries", async () => {
    let callCount = 0;
    const fn = vi.fn().mockImplementation(async () => {
      callCount++;
      throw new Error(`fail ${callCount}`);
    });

    await expect(withRetry(fn, 1)).rejects.toThrow("fail 2");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("defaults to 1 retry (2 total attempts)", async () => {
    const fn = vi.fn().mockImplementation(async () => {
      throw new Error("always fails");
    });

    await expect(withRetry(fn)).rejects.toThrow("always fails");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("respects custom maxRetries count", async () => {
    const fn = vi.fn().mockImplementation(async () => {
      throw new Error("fail");
    });

    await expect(withRetry(fn, 3)).rejects.toThrow("fail");
    expect(fn).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
  });

  it("uses exponential backoff between retries", async () => {
    const fn = vi.fn().mockImplementation(async () => {
      throw new Error("fail");
    });

    await expect(withRetry(fn, 2)).rejects.toThrow("fail");

    // Verify the recorded delay values use exponential backoff
    const backoffDelays = recordedDelays.filter((d) => d >= 1000);
    expect(backoffDelays[0]).toBe(1000); // 2^0 * 1000
    expect(backoffDelays[1]).toBe(2000); // 2^1 * 1000
  });

  it("converts non-Error exceptions to Error objects", async () => {
    const fn = vi.fn().mockImplementation(async () => {
      throw "string error";
    });

    await expect(withRetry(fn, 0)).rejects.toThrow("string error");
  });

  it("works with zero retries (single attempt)", async () => {
    const fn = vi.fn().mockImplementation(async () => {
      throw new Error("immediate fail");
    });

    await expect(withRetry(fn, 0)).rejects.toThrow("immediate fail");
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
