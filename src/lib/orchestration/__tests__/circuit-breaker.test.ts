import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CircuitBreaker, CircuitBreakerOpenError } from "../circuit-breaker";

describe("CircuitBreaker", () => {
  let cb: CircuitBreaker;

  beforeEach(() => {
    vi.useFakeTimers();
    cb = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeoutMs: 5000,
      halfOpenSuccessThreshold: 2,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts in closed state", () => {
    expect(cb.getState()).toBe("closed");
  });

  it("allows requests in closed state", async () => {
    const result = await cb.execute(() => Promise.resolve("ok"));
    expect(result).toBe("ok");
  });

  it("stays closed below failure threshold", async () => {
    await cb.execute(() => Promise.reject(new Error("fail"))).catch(() => {});
    await cb.execute(() => Promise.reject(new Error("fail"))).catch(() => {});

    expect(cb.getState()).toBe("closed");
  });

  it("opens after reaching failure threshold", async () => {
    for (let i = 0; i < 3; i++) {
      await cb.execute(() => Promise.reject(new Error("fail"))).catch(() => {});
    }

    expect(cb.getState()).toBe("open");
  });

  it("rejects requests when open", async () => {
    for (let i = 0; i < 3; i++) {
      await cb.execute(() => Promise.reject(new Error("fail"))).catch(() => {});
    }

    await expect(cb.execute(() => Promise.resolve("ok"))).rejects.toThrow(
      CircuitBreakerOpenError
    );
  });

  it("transitions to half-open after reset timeout", async () => {
    for (let i = 0; i < 3; i++) {
      await cb.execute(() => Promise.reject(new Error("fail"))).catch(() => {});
    }

    expect(cb.getState()).toBe("open");

    vi.advanceTimersByTime(5000);

    expect(cb.getState()).toBe("half_open");
  });

  it("closes again after successful half-open requests", async () => {
    // Open the circuit
    for (let i = 0; i < 3; i++) {
      await cb.execute(() => Promise.reject(new Error("fail"))).catch(() => {});
    }

    // Wait for reset timeout
    vi.advanceTimersByTime(5000);

    // Successful half-open requests (need 2 per halfOpenSuccessThreshold)
    await cb.execute(() => Promise.resolve("ok1"));
    await cb.execute(() => Promise.resolve("ok2"));

    expect(cb.getState()).toBe("closed");
  });

  it("reopens on failure during half-open", async () => {
    // Open the circuit
    for (let i = 0; i < 3; i++) {
      await cb.execute(() => Promise.reject(new Error("fail"))).catch(() => {});
    }

    vi.advanceTimersByTime(5000);

    // Fail during half-open
    await cb
      .execute(() => Promise.reject(new Error("still broken")))
      .catch(() => {});

    expect(cb.getState()).toBe("open");
  });

  it("resets failure count on success in closed state", async () => {
    // Two failures
    await cb.execute(() => Promise.reject(new Error("fail"))).catch(() => {});
    await cb.execute(() => Promise.reject(new Error("fail"))).catch(() => {});

    // One success resets the counter
    await cb.execute(() => Promise.resolve("ok"));

    // Two more failures shouldn't open (counter was reset)
    await cb.execute(() => Promise.reject(new Error("fail"))).catch(() => {});
    await cb.execute(() => Promise.reject(new Error("fail"))).catch(() => {});

    expect(cb.getState()).toBe("closed");
  });

  it("manual reset returns to closed state", async () => {
    for (let i = 0; i < 3; i++) {
      await cb.execute(() => Promise.reject(new Error("fail"))).catch(() => {});
    }

    expect(cb.getState()).toBe("open");

    cb.reset();

    expect(cb.getState()).toBe("closed");
    const result = await cb.execute(() => Promise.resolve("ok"));
    expect(result).toBe("ok");
  });

  it("tracks metrics correctly", async () => {
    await cb.execute(() => Promise.resolve("ok"));
    await cb.execute(() => Promise.reject(new Error("fail"))).catch(() => {});

    const metrics = cb.getMetrics();
    expect(metrics.successes).toBe(1);
    expect(metrics.failures).toBe(1);
    expect(metrics.lastFailureTime).not.toBeNull();
  });

  it("tracks rejected requests", async () => {
    for (let i = 0; i < 3; i++) {
      await cb.execute(() => Promise.reject(new Error("fail"))).catch(() => {});
    }

    // Try two more — should be rejected
    await cb.execute(() => Promise.resolve("ok")).catch(() => {});
    await cb.execute(() => Promise.resolve("ok")).catch(() => {});

    expect(cb.getMetrics().totalRejected).toBe(2);
  });
});
