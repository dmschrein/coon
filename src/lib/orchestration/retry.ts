/**
 * Enhanced retry utility with configurable backoff strategies.
 *
 * Supports: exponential, linear, and fibonacci backoff.
 * Includes shouldRetry predicate to skip retries on non-transient errors.
 */

export type BackoffStrategy = "exponential" | "linear" | "fibonacci";

export interface RetryOptions {
  maxRetries: number;
  backoffStrategy?: BackoffStrategy;
  /** Base delay in ms (default: 1000) */
  baseDelayMs?: number;
  /** Maximum delay in ms (default: 30000) */
  maxDelayMs?: number;
  /** Return true if the error is retryable. Defaults to always true. */
  shouldRetry?: (error: Error) => boolean;
  /** Called on each retry attempt */
  onRetry?: (attempt: number, error: Error, delayMs: number) => void;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, "onRetry" | "shouldRetry">> =
  {
    maxRetries: 1,
    backoffStrategy: "exponential",
    baseDelayMs: 1000,
    maxDelayMs: 30_000,
  };

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if we should retry this type of error
      if (options.shouldRetry && !options.shouldRetry(lastError)) {
        throw lastError;
      }

      if (attempt < opts.maxRetries) {
        const delay = calculateDelay(
          attempt,
          opts.backoffStrategy,
          opts.baseDelayMs,
          opts.maxDelayMs
        );

        options.onRetry?.(attempt + 1, lastError, delay);

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

function calculateDelay(
  attempt: number,
  strategy: BackoffStrategy,
  baseDelayMs: number,
  maxDelayMs: number
): number {
  let delay: number;

  switch (strategy) {
    case "exponential":
      delay = baseDelayMs * Math.pow(2, attempt);
      break;
    case "linear":
      delay = baseDelayMs * (attempt + 1);
      break;
    case "fibonacci":
      delay = baseDelayMs * fibonacci(attempt + 2);
      break;
    default:
      delay = baseDelayMs * Math.pow(2, attempt);
  }

  // Add jitter (up to 10% of the delay)
  const jitter = delay * 0.1 * Math.random();
  return Math.min(delay + jitter, maxDelayMs);
}

function fibonacci(n: number): number {
  if (n <= 1) return n;
  let a = 0;
  let b = 1;
  for (let i = 2; i <= n; i++) {
    const temp = a + b;
    a = b;
    b = temp;
  }
  return b;
}

/**
 * Common shouldRetry predicates for Anthropic API errors.
 */
export const retryPredicates = {
  /** Retry on rate limits and server errors, not on auth or validation errors */
  anthropicTransient: (error: Error): boolean => {
    const message = error.message.toLowerCase();
    // Don't retry auth errors
    if (message.includes("authentication") || message.includes("api key")) {
      return false;
    }
    // Don't retry validation errors (bad request)
    if (message.includes("validation") || message.includes("invalid")) {
      return false;
    }
    // Retry on rate limits, overloaded, server errors
    if (
      message.includes("rate limit") ||
      message.includes("overloaded") ||
      message.includes("529") ||
      message.includes("500") ||
      message.includes("503")
    ) {
      return true;
    }
    // Default: retry on unknown errors
    return true;
  },

  /** Never retry - useful for testing or non-retryable operations */
  never: (): boolean => false,

  /** Always retry - useful as a fallback */
  always: (): boolean => true,
};
