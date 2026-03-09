/**
 * Agent Queue - Priority-based task execution with concurrency control and rate limiting.
 *
 * Manages AI agent execution to respect Anthropic API limits,
 * prevent overload, and prioritize critical tasks.
 */

export interface AgentTask<T = unknown> {
  id: string;
  agentType: string;
  priority: number; // Lower = higher priority
  execute: () => Promise<T>;
  tokenBudget?: number;
}

export interface AgentQueueOptions {
  maxConcurrent: number;
  /** Max requests per minute to respect API rate limits */
  rateLimit: number;
  /** Token budget per minute (0 = unlimited) */
  tokenBudgetPerMinute?: number;
}

export interface QueueMetrics {
  totalExecuted: number;
  totalFailed: number;
  totalTokensUsed: number;
  averageDurationMs: number;
  queueDepth: number;
}

interface QueueEntry<T = unknown> {
  task: AgentTask<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  enqueuedAt: number;
}

export class AgentQueue {
  private queue: QueueEntry[] = [];
  private activeCount = 0;
  private requestTimestamps: number[] = [];
  private tokensUsedInWindow: number[] = [];
  private metrics: QueueMetrics = {
    totalExecuted: 0,
    totalFailed: 0,
    totalTokensUsed: 0,
    averageDurationMs: 0,
    queueDepth: 0,
  };

  constructor(private options: AgentQueueOptions) {}

  /**
   * Enqueue a single task. Returns a promise that resolves when the task completes.
   */
  enqueue<T>(task: AgentTask<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const entry: QueueEntry<T> = {
        task,
        resolve,
        reject,
        enqueuedAt: Date.now(),
      };

      // Insert sorted by priority (lower number = higher priority)
      const insertIndex = this.queue.findIndex(
        (e) => e.task.priority > task.priority
      );
      if (insertIndex === -1) {
        this.queue.push(entry as QueueEntry);
      } else {
        this.queue.splice(insertIndex, 0, entry as QueueEntry);
      }

      this.metrics.queueDepth = this.queue.length;
      this.processNext();
    });
  }

  /**
   * Execute a batch of tasks with concurrency control.
   * Returns results in the same order as the input tasks.
   */
  async executeBatch<T>(
    tasks: AgentTask<T>[],
    concurrency?: number
  ): Promise<PromiseSettledResult<T>[]> {
    const originalMax = this.options.maxConcurrent;
    if (concurrency !== undefined) {
      this.options.maxConcurrent = Math.min(
        concurrency,
        this.options.maxConcurrent
      );
    }

    const promises = tasks.map((task) => this.enqueue(task));

    this.options.maxConcurrent = originalMax;

    return Promise.allSettled(promises);
  }

  getMetrics(): QueueMetrics {
    return { ...this.metrics, queueDepth: this.queue.length };
  }

  getQueueDepth(): number {
    return this.queue.length;
  }

  getActiveCount(): number {
    return this.activeCount;
  }

  /**
   * Clear all pending tasks from the queue, rejecting their promises.
   */
  clear(): void {
    for (const entry of this.queue) {
      entry.reject(new Error("Queue cleared"));
    }
    this.queue = [];
    this.metrics.queueDepth = 0;
  }

  private async processNext(): Promise<void> {
    if (this.queue.length === 0) return;
    if (this.activeCount >= this.options.maxConcurrent) return;
    if (!this.canMakeRequest()) return;

    const entry = this.queue.shift()!;
    this.metrics.queueDepth = this.queue.length;
    this.activeCount++;
    this.recordRequest();

    const startTime = Date.now();

    try {
      const result = await entry.task.execute();
      const duration = Date.now() - startTime;

      this.metrics.totalExecuted++;
      this.updateAverageDuration(duration);

      if (entry.task.tokenBudget) {
        this.metrics.totalTokensUsed += entry.task.tokenBudget;
        this.tokensUsedInWindow.push(entry.task.tokenBudget);
      }

      entry.resolve(result);
    } catch (error) {
      this.metrics.totalFailed++;
      entry.reject(error instanceof Error ? error : new Error(String(error)));
    } finally {
      this.activeCount--;
      this.processNext();
    }
  }

  private canMakeRequest(): boolean {
    const now = Date.now();
    const windowStart = now - 60_000;

    // Clean up old timestamps
    this.requestTimestamps = this.requestTimestamps.filter(
      (t) => t > windowStart
    );

    if (this.requestTimestamps.length >= this.options.rateLimit) {
      // Schedule a retry when the oldest request falls out of the window
      const waitTime = this.requestTimestamps[0] - windowStart + 10;
      setTimeout(() => this.processNext(), waitTime);
      return false;
    }

    // Check token budget if configured
    if (this.options.tokenBudgetPerMinute) {
      this.tokensUsedInWindow = this.tokensUsedInWindow.filter(
        (_, i) =>
          this.requestTimestamps[i] && this.requestTimestamps[i] > windowStart
      );
      const totalTokens = this.tokensUsedInWindow.reduce((a, b) => a + b, 0);
      if (totalTokens >= this.options.tokenBudgetPerMinute) {
        setTimeout(() => this.processNext(), 5000);
        return false;
      }
    }

    return true;
  }

  private recordRequest(): void {
    this.requestTimestamps.push(Date.now());
  }

  private updateAverageDuration(duration: number): void {
    const total = this.metrics.totalExecuted;
    this.metrics.averageDurationMs =
      (this.metrics.averageDurationMs * (total - 1) + duration) / total;
  }
}
