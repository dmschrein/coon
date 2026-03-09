/**
 * Orchestration module barrel export.
 *
 * Provides a pre-configured orchestration instance and exports all components.
 */

export {
  AgentQueue,
  type AgentTask,
  type AgentQueueOptions,
  type QueueMetrics,
} from "./agent-queue";
export {
  AgentPipeline,
  type PipelineOptions,
  type PipelineStepResult,
  type ContentGenerationResult,
  type FullCampaignResult,
} from "./agent-pipeline";
export {
  CircuitBreaker,
  CircuitBreakerOpenError,
  type CircuitState,
  type CircuitBreakerOptions,
  type CircuitBreakerMetrics,
} from "./circuit-breaker";
export {
  CacheManager,
  type CacheManagerOptions,
  type CacheStats,
} from "./cache-manager";
export {
  retryWithBackoff,
  retryPredicates,
  type RetryOptions,
  type BackoffStrategy,
} from "./retry";

import { AgentQueue } from "./agent-queue";
import { AgentPipeline } from "./agent-pipeline";
import { CircuitBreaker } from "./circuit-breaker";
import { CacheManager } from "./cache-manager";

/**
 * Create a fully configured orchestration stack with sensible defaults.
 */
export function createOrchestration(options?: {
  maxConcurrent?: number;
  rateLimit?: number;
  cacheTtlMs?: number;
  cacheMaxEntries?: number;
  failureThreshold?: number;
  resetTimeoutMs?: number;
}) {
  const queue = new AgentQueue({
    maxConcurrent: options?.maxConcurrent ?? 3,
    rateLimit: options?.rateLimit ?? 50,
  });

  const circuitBreaker = new CircuitBreaker({
    failureThreshold: options?.failureThreshold ?? 5,
    resetTimeoutMs: options?.resetTimeoutMs ?? 30_000,
    halfOpenSuccessThreshold: 2,
  });

  const cache = new CacheManager({
    defaultTtlMs: options?.cacheTtlMs ?? 5 * 60 * 1000, // 5 minutes
    maxEntries: options?.cacheMaxEntries ?? 100,
  });

  const pipeline = new AgentPipeline({ queue, circuitBreaker, cache });

  return { queue, circuitBreaker, cache, pipeline };
}
