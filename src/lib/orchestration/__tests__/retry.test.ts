import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { retryWithBackoff, retryPredicates } from "../retry";

describe("retryWithBackoff", () => {
  let originalSetTimeout: typeof globalThis.setTimeout;

  beforeEach(() => {
    originalSetTimeout = globalThis.setTimeout;
    vi.stubGlobal("setTimeout", (fn: (...args: unknown[]) => void) => {
      Promise.resolve().then(() => fn());
      return 0 as unknown as ReturnType<typeof setTimeout>;
    });
  });

  afterEach(() => {
    vi.stubGlobal("setTimeout", originalSetTimeout);
  });

  it("returns result on first success", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await retryWithBackoff(fn, { maxRetries: 3 });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries and succeeds on second attempt", async () => {
    let callCount = 0;
    const fn = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount === 1) throw new Error("fail");
      return "ok";
    });

    const result = await retryWithBackoff(fn, { maxRetries: 2 });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("throws after exhausting retries", async () => {
    const fn = vi.fn().mockImplementation(async () => {
      throw new Error("always fails");
    });

    await expect(retryWithBackoff(fn, { maxRetries: 2 })).rejects.toThrow(
      "always fails"
    );
    expect(fn).toHaveBeenCalledTimes(3); // 1 + 2 retries
  });

  it("calls onRetry callback on each retry", async () => {
    const onRetry = vi.fn();
    const fn = vi.fn().mockImplementation(async () => {
      throw new Error("fail");
    });

    await retryWithBackoff(fn, {
      maxRetries: 2,
      onRetry,
    }).catch(() => {});

    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(onRetry.mock.calls[0][0]).toBe(1); // attempt number
    expect(onRetry.mock.calls[1][0]).toBe(2);
  });

  it("skips retry when shouldRetry returns false", async () => {
    const fn = vi.fn().mockImplementation(async () => {
      throw new Error("validation error");
    });

    await expect(
      retryWithBackoff(fn, {
        maxRetries: 3,
        shouldRetry: (error) => !error.message.includes("validation"),
      })
    ).rejects.toThrow("validation error");

    // Should only try once — no retries
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("converts non-Error exceptions", async () => {
    const fn = vi.fn().mockImplementation(async () => {
      throw "string error";
    });

    await expect(retryWithBackoff(fn, { maxRetries: 0 })).rejects.toThrow(
      "string error"
    );
  });
});

describe("retryPredicates", () => {
  describe("anthropicTransient", () => {
    it("retries rate limit errors", () => {
      expect(
        retryPredicates.anthropicTransient(new Error("rate limit exceeded"))
      ).toBe(true);
    });

    it("retries overloaded errors", () => {
      expect(
        retryPredicates.anthropicTransient(new Error("API overloaded"))
      ).toBe(true);
    });

    it("does not retry authentication errors", () => {
      expect(
        retryPredicates.anthropicTransient(new Error("authentication failed"))
      ).toBe(false);
    });

    it("does not retry validation errors", () => {
      expect(
        retryPredicates.anthropicTransient(new Error("validation failed"))
      ).toBe(false);
    });

    it("retries unknown errors by default", () => {
      expect(
        retryPredicates.anthropicTransient(new Error("something unexpected"))
      ).toBe(true);
    });
  });

  describe("never", () => {
    it("always returns false", () => {
      expect(retryPredicates.never(new Error("anything"))).toBe(false);
    });
  });

  describe("always", () => {
    it("always returns true", () => {
      expect(retryPredicates.always(new Error("anything"))).toBe(true);
    });
  });
});
