/**
 * Agent Plugin System - Lifecycle hooks for extending agent behavior.
 *
 * Plugins run before/after agent execution and on errors.
 * Built-in plugins: token tracking, caching, rate limiting.
 */

export interface AgentContext {
  agentType: string;
  userId: string;
  input: unknown;
  startTime: number;
  metadata: Record<string, unknown>;
}

export interface AgentPlugin {
  name: string;
  /** Runs before agent execution. Can modify context or short-circuit. */
  beforeExecution?(context: AgentContext): Promise<void>;
  /** Runs after successful agent execution. */
  afterExecution?(
    context: AgentContext,
    result: unknown,
    tokensUsed: number
  ): Promise<void>;
  /** Runs when agent execution fails. */
  onError?(context: AgentContext, error: Error): Promise<void>;
}

/**
 * Plugin runner that manages an ordered list of plugins.
 */
export class PluginRunner {
  private plugins: AgentPlugin[] = [];

  register(plugin: AgentPlugin): void {
    this.plugins.push(plugin);
  }

  unregister(name: string): void {
    this.plugins = this.plugins.filter((p) => p.name !== name);
  }

  getPlugins(): AgentPlugin[] {
    return [...this.plugins];
  }

  async runBeforeExecution(context: AgentContext): Promise<void> {
    for (const plugin of this.plugins) {
      if (plugin.beforeExecution) {
        await plugin.beforeExecution(context);
      }
    }
  }

  async runAfterExecution(
    context: AgentContext,
    result: unknown,
    tokensUsed: number
  ): Promise<void> {
    for (const plugin of this.plugins) {
      if (plugin.afterExecution) {
        await plugin.afterExecution(context, result, tokensUsed);
      }
    }
  }

  async runOnError(context: AgentContext, error: Error): Promise<void> {
    for (const plugin of this.plugins) {
      if (plugin.onError) {
        try {
          await plugin.onError(context, error);
        } catch {
          // Plugin errors should not cascade
        }
      }
    }
  }

  /**
   * Wrap an agent function with plugin lifecycle hooks.
   */
  wrap<TInput, TOutput>(
    agentType: string,
    userId: string,
    fn: (input: TInput) => Promise<{ data: TOutput; tokensUsed: number }>
  ): (input: TInput) => Promise<{ data: TOutput; tokensUsed: number }> {
    return async (input: TInput) => {
      const context: AgentContext = {
        agentType,
        userId,
        input,
        startTime: Date.now(),
        metadata: {},
      };

      await this.runBeforeExecution(context);

      try {
        const result = await fn(input);
        await this.runAfterExecution(context, result.data, result.tokensUsed);
        return result;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        await this.runOnError(context, err);
        throw err;
      }
    };
  }
}

// ─── Built-in Plugins ────────────────────────────────────────────────────────

/**
 * Tracks token usage per agent type and user.
 */
export class TokenTrackingPlugin implements AgentPlugin {
  name = "token-tracking";

  private usage: Map<string, { total: number; count: number }> = new Map();

  async afterExecution(
    context: AgentContext,
    _result: unknown,
    tokensUsed: number
  ): Promise<void> {
    const key = `${context.userId}:${context.agentType}`;
    const current = this.usage.get(key) ?? { total: 0, count: 0 };
    this.usage.set(key, {
      total: current.total + tokensUsed,
      count: current.count + 1,
    });
  }

  getUsage(userId: string, agentType: string) {
    return this.usage.get(`${userId}:${agentType}`) ?? { total: 0, count: 0 };
  }

  getTotalUsage() {
    let total = 0;
    for (const entry of this.usage.values()) {
      total += entry.total;
    }
    return total;
  }
}

/**
 * Logs execution duration and status.
 */
export class DurationTrackingPlugin implements AgentPlugin {
  name = "duration-tracking";

  private durations: Map<string, number[]> = new Map();

  async afterExecution(context: AgentContext): Promise<void> {
    const duration = Date.now() - context.startTime;
    const key = context.agentType;
    const current = this.durations.get(key) ?? [];
    current.push(duration);
    this.durations.set(key, current);
  }

  getP95(agentType: string): number {
    const values = this.durations.get(agentType) ?? [];
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length * 0.95)];
  }

  getAverage(agentType: string): number {
    const values = this.durations.get(agentType) ?? [];
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }
}
