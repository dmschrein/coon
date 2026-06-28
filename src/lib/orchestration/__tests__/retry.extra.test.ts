import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { retryWithBackoff } from "../retry";

/**
 * Captures the delay passed to each onRetry call so we can assert on the
 * backoff strategy math without waiting real time.
 */
describe("retryWithBackoff backoff strategies", () => {
  beforeEach(() => {
    // Make setTimeout resolve immediately, preserving the requested delay arg.
    vi.stubGlobal("setTimeout", (fn: (...args: unknown[]) => void) => {
      Promise.resolve().then(() => fn());
      return 0 as unknown as ReturnType<typeof setTimeout>;
    });
    // Remove jitter so delay math is deterministic.
    vi.spyOn(Math, "random").mockReturnValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function collectDelays(
    strategy: "exponential" | "linear" | "fibonacci",
    opts?: { baseDelayMs?: number; maxDelayMs?: number; maxRetries?: number }
  ): Promise<number[]> {
    const delays: number[] = [];
    const fn = vi.fn().mockRejectedValue(new Error("fail"));
    await retryWithBackoff(fn, {
      maxRetries: opts?.maxRetries ?? 3,
      backoffStrategy: strategy,
      baseDelayMs: opts?.baseDelayMs ?? 100,
      maxDelayMs: opts?.maxDelayMs ?? 1_000_000,
      onRetry: (_attempt, _err, delayMs) => delays.push(delayMs),
    }).catch(() => {});
    return delays;
  }

  it("exponential: base * 2^attempt", async () => {
    const delays = await collectDelays("exponential");
    // attempts 0,1,2 -> 100, 200, 400
    expect(delays).toEqual([100, 200, 400]);
  });

  it("linear: base * (attempt + 1)", async () => {
    const delays = await collectDelays("linear");
    // attempts 0,1,2 -> 100, 200, 300
    expect(delays).toEqual([100, 200, 300]);
  });

  it("fibonacci: base * fib(attempt + 2)", async () => {
    const delays = await collectDelays("fibonacci");
    // fib(2)=1, fib(3)=2, fib(4)=3 -> 100, 200, 300
    expect(delays).toEqual([100, 200, 300]);
  });

  it("caps delay at maxDelayMs", async () => {
    const delays = await collectDelays("exponential", {
      baseDelayMs: 1000,
      maxDelayMs: 1500,
      maxRetries: 3,
    });
    // 1000, 2000->capped 1500, 4000->capped 1500
    expect(delays).toEqual([1000, 1500, 1500]);
  });

  it("applies jitter up to 10% of the delay", async () => {
    vi.spyOn(Math, "random").mockReturnValue(1);
    const delays: number[] = [];
    const fn = vi.fn().mockRejectedValue(new Error("fail"));
    await retryWithBackoff(fn, {
      maxRetries: 1,
      backoffStrategy: "exponential",
      baseDelayMs: 100,
      maxDelayMs: 1_000_000,
      onRetry: (_a, _e, d) => delays.push(d),
    }).catch(() => {});
    // 100 + 100*0.1*1 = 110
    expect(delays[0]).toBeCloseTo(110, 5);
  });

  it("uses defaults (exponential, maxRetries 1) when minimal options given", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("transient"))
      .mockResolvedValue("ok");
    const result = await retryWithBackoff(fn, { maxRetries: 1 });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
