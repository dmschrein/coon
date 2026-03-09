/**
 * Agent Pipeline - Chains agents together for multi-step workflows.
 *
 * Handles the full campaign generation flow:
 *   quiz -> audience profile -> campaign strategy -> calendar -> content (parallel per platform)
 *
 * Supports conditional branching, parallel execution, and dependency resolution.
 */

import { AgentQueue, type AgentTask } from "./agent-queue";
import { CircuitBreaker } from "./circuit-breaker";
import { CacheManager } from "./cache-manager";
import type {
  CampaignStrategy,
  CampaignCalendar,
  CampaignPlatform,
} from "@/types";

export interface PipelineOptions {
  queue: AgentQueue;
  circuitBreaker: CircuitBreaker;
  cache: CacheManager;
}

export interface PipelineStepResult<T> {
  data: T;
  durationMs: number;
  tokensUsed: number;
  cached: boolean;
}

export interface ContentGenerationResult {
  platform: CampaignPlatform;
  content: unknown;
  tokensUsed: number;
  durationMs: number;
  error?: string;
}

export interface FullCampaignResult {
  strategy: PipelineStepResult<CampaignStrategy>;
  calendar: PipelineStepResult<CampaignCalendar>;
  content: ContentGenerationResult[];
  totalTokensUsed: number;
  totalDurationMs: number;
}

type AgentFn<TInput, TOutput> = (
  input: TInput
) => Promise<{ data: TOutput; tokensUsed: number }>;

export class AgentPipeline {
  private queue: AgentQueue;
  private circuitBreaker: CircuitBreaker;
  private cache: CacheManager;

  constructor(options: PipelineOptions) {
    this.queue = options.queue;
    this.circuitBreaker = options.circuitBreaker;
    this.cache = options.cache;
  }

  /**
   * Execute a single pipeline step with queue management, circuit breaking, and caching.
   */
  async executeStep<TInput, TOutput>(
    agentType: string,
    input: TInput,
    agentFn: AgentFn<TInput, TOutput>,
    options?: { priority?: number; cacheTtlMs?: number }
  ): Promise<PipelineStepResult<TOutput>> {
    const cacheKey = CacheManager.buildKey(agentType, input);
    const priority = options?.priority ?? 5;

    // Check cache first
    const cached = this.cache.get<PipelineStepResult<TOutput>>(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    const task: AgentTask<PipelineStepResult<TOutput>> = {
      id: `${agentType}-${Date.now()}`,
      agentType,
      priority,
      execute: async () => {
        const startTime = Date.now();
        const result = await this.circuitBreaker.execute(() => agentFn(input));
        const durationMs = Date.now() - startTime;

        return {
          data: result.data,
          durationMs,
          tokensUsed: result.tokensUsed,
          cached: false,
        };
      },
    };

    const result = await this.queue.enqueue(task);

    // Cache the result
    if (options?.cacheTtlMs) {
      this.cache.set(cacheKey, result, options.cacheTtlMs);
    }

    return result;
  }

  /**
   * Execute multiple steps in parallel with independent failure handling.
   */
  async executeParallel<T>(
    steps: Array<{
      agentType: string;
      id: string;
      execute: () => Promise<T>;
      priority?: number;
    }>
  ): Promise<Array<{ id: string; result?: T; error?: string }>> {
    const tasks: AgentTask<{ id: string; data: T }>[] = steps.map((step) => ({
      id: step.id,
      agentType: step.agentType,
      priority: step.priority ?? 5,
      execute: async () => {
        const data = await this.circuitBreaker.execute(step.execute);
        return { id: step.id, data };
      },
    }));

    const settled = await this.queue.executeBatch(tasks);

    return settled.map((outcome, i) => {
      if (outcome.status === "fulfilled") {
        return { id: outcome.value.id, result: outcome.value.data };
      }
      return {
        id: steps[i].id,
        error:
          outcome.reason instanceof Error
            ? outcome.reason.message
            : String(outcome.reason),
      };
    });
  }

  /**
   * Generate content for multiple platforms in parallel with concurrency control.
   * This replaces the manual batch logic with queue-managed parallel execution.
   */
  async generatePlatformContent(
    platforms: CampaignPlatform[],
    generatorMap: Record<
      string,
      () => Promise<{ content: unknown; tokensUsed: number }>
    >
  ): Promise<ContentGenerationResult[]> {
    const steps = platforms.map((platform) => ({
      agentType: "campaign_content",
      id: platform,
      execute: async () => {
        const generator = generatorMap[platform];
        if (!generator) {
          throw new Error(`No generator for platform: ${platform}`);
        }
        return generator();
      },
      // Heavy platforms get lower priority (processed first in the queue)
      priority: getplatformPriority(platform),
    }));

    const results = await this.executeParallel(steps);

    return results.map((r) => {
      const startTime = Date.now();
      if (r.result) {
        return {
          platform: r.id as CampaignPlatform,
          content: (r.result as { content: unknown }).content,
          tokensUsed: (r.result as { tokensUsed: number }).tokensUsed,
          durationMs: Date.now() - startTime,
        };
      }
      return {
        platform: r.id as CampaignPlatform,
        content: null,
        tokensUsed: 0,
        durationMs: Date.now() - startTime,
        error: r.error,
      };
    });
  }

  /**
   * Check if the pipeline is healthy (circuit breaker is not open).
   */
  isHealthy(): boolean {
    return this.circuitBreaker.getState() !== "open";
  }

  /**
   * Get pipeline status for monitoring.
   */
  getStatus() {
    return {
      queue: this.queue.getMetrics(),
      circuitBreaker: this.circuitBreaker.getMetrics(),
      cache: this.cache.getStats(),
      healthy: this.isHealthy(),
    };
  }
}

const HEAVY_PLATFORMS: CampaignPlatform[] = ["blog", "youtube"];
const MEDIUM_PLATFORMS: CampaignPlatform[] = [
  "email",
  "linkedin",
  "tiktok",
  "twitter",
  "instagram",
  "reddit",
];

function getplatformPriority(platform: CampaignPlatform): number {
  if (HEAVY_PLATFORMS.includes(platform)) return 1;
  if (MEDIUM_PLATFORMS.includes(platform)) return 3;
  return 5;
}
