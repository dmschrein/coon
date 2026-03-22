/**
 * Circuit Breaker - Prevents cascading failures when the Claude API is degraded.
 *
 * States:
 *   CLOSED  -> normal operation, requests go through
 *   OPEN    -> too many failures, requests are rejected immediately
 *   HALF_OPEN -> testing if the service recovered, allows a limited number of requests
 */

export type CircuitState = "closed" | "open" | "half_open";

export interface CircuitBreakerOptions {
  /** Number of failures before opening the circuit */
  failureThreshold: number;
  /** Time in ms to wait before attempting recovery (half-open) */
  resetTimeoutMs: number;
  /** Number of successful requests in half-open to close the circuit */
  halfOpenSuccessThreshold?: number;
}

export interface CircuitBreakerMetrics {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: number | null;
  totalRejected: number;
}

export class CircuitBreaker {
  private state: CircuitState = "closed";
  private failures = 0;
  private successes = 0;
  private lastFailureTime: number | null = null;
  private totalRejected = 0;
  private halfOpenSuccessCount = 0;

  constructor(private options: CircuitBreakerOptions) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      if (this.shouldAttemptReset()) {
        this.state = "half_open";
        this.halfOpenSuccessCount = 0;
      } else {
        this.totalRejected++;
        throw new CircuitBreakerOpenError(
          `Circuit breaker is OPEN. Will retry after ${this.getTimeUntilRetry()}ms.`
        );
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  getState(): CircuitState {
    // Check if we should auto-transition from open to half_open
    if (this.state === "open" && this.shouldAttemptReset()) {
      return "half_open";
    }
    return this.state;
  }

  getMetrics(): CircuitBreakerMetrics {
    return {
      state: this.getState(),
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      totalRejected: this.totalRejected,
    };
  }

  /**
   * Manually reset the circuit breaker to closed state.
   */
  reset(): void {
    this.state = "closed";
    this.failures = 0;
    this.halfOpenSuccessCount = 0;
  }

  private onSuccess(): void {
    this.successes++;

    if (this.state === "half_open") {
      this.halfOpenSuccessCount++;
      const threshold = this.options.halfOpenSuccessThreshold ?? 1;
      if (this.halfOpenSuccessCount >= threshold) {
        this.state = "closed";
        this.failures = 0;
        this.halfOpenSuccessCount = 0;
      }
    } else if (this.state === "closed") {
      // Reset failure count on success in closed state
      this.failures = 0;
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === "half_open") {
      // Any failure in half-open goes back to open
      this.state = "open";
      this.halfOpenSuccessCount = 0;
    } else if (this.failures >= this.options.failureThreshold) {
      this.state = "open";
    }
  }

  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) return true;
    return Date.now() - this.lastFailureTime >= this.options.resetTimeoutMs;
  }

  private getTimeUntilRetry(): number {
    if (!this.lastFailureTime) return 0;
    const elapsed = Date.now() - this.lastFailureTime;
    return Math.max(0, this.options.resetTimeoutMs - elapsed);
  }
}

export class CircuitBreakerOpenError extends Error {
  readonly isCircuitBreakerError = true;

  constructor(message: string) {
    super(message);
    this.name = "CircuitBreakerOpenError";
  }
}
