import { describe, it, expect, vi } from "vitest";
import {
  PluginRunner,
  TokenTrackingPlugin,
  DurationTrackingPlugin,
  type AgentContext,
  type AgentPlugin,
} from "../agent-plugin";

function createContext(overrides?: Partial<AgentContext>): AgentContext {
  return {
    agentType: "audience_analysis",
    userId: "user-1",
    input: {},
    startTime: Date.now(),
    metadata: {},
    ...overrides,
  };
}

describe("PluginRunner", () => {
  it("registers and retrieves plugins", () => {
    const runner = new PluginRunner();
    const plugin: AgentPlugin = { name: "test" };

    runner.register(plugin);
    expect(runner.getPlugins()).toHaveLength(1);
    expect(runner.getPlugins()[0].name).toBe("test");
  });

  it("unregisters plugins by name", () => {
    const runner = new PluginRunner();
    runner.register({ name: "keep" });
    runner.register({ name: "remove" });

    runner.unregister("remove");
    expect(runner.getPlugins()).toHaveLength(1);
    expect(runner.getPlugins()[0].name).toBe("keep");
  });

  it("returns a copy of plugins array", () => {
    const runner = new PluginRunner();
    runner.register({ name: "test" });

    const plugins = runner.getPlugins();
    plugins.push({ name: "sneaky" });

    expect(runner.getPlugins()).toHaveLength(1);
  });

  it("runs beforeExecution hooks in order", async () => {
    const order: string[] = [];
    const runner = new PluginRunner();

    runner.register({
      name: "first",
      beforeExecution: async () => {
        order.push("first");
      },
    });
    runner.register({
      name: "second",
      beforeExecution: async () => {
        order.push("second");
      },
    });

    await runner.runBeforeExecution(createContext());
    expect(order).toEqual(["first", "second"]);
  });

  it("runs afterExecution hooks in order", async () => {
    const order: string[] = [];
    const runner = new PluginRunner();

    runner.register({
      name: "first",
      afterExecution: async () => {
        order.push("first");
      },
    });
    runner.register({
      name: "second",
      afterExecution: async () => {
        order.push("second");
      },
    });

    await runner.runAfterExecution(createContext(), { result: "ok" }, 100);
    expect(order).toEqual(["first", "second"]);
  });

  it("runs onError hooks and swallows plugin errors", async () => {
    const onError1 = vi.fn();
    const runner = new PluginRunner();

    runner.register({
      name: "failing",
      onError: async () => {
        throw new Error("plugin bug");
      },
    });
    runner.register({
      name: "working",
      onError: onError1,
    });

    const context = createContext();
    const error = new Error("agent error");

    // Should not throw even though first plugin throws
    await runner.runOnError(context, error);

    // Second plugin should still be called
    expect(onError1).toHaveBeenCalledWith(context, error);
  });

  it("skips plugins without the hook defined", async () => {
    const runner = new PluginRunner();
    runner.register({ name: "no-hooks" });

    // Should not throw
    await runner.runBeforeExecution(createContext());
    await runner.runAfterExecution(createContext(), {}, 0);
    await runner.runOnError(createContext(), new Error("test"));
  });

  describe("wrap()", () => {
    it("wraps a function with lifecycle hooks", async () => {
      const beforeFn = vi.fn();
      const afterFn = vi.fn();
      const runner = new PluginRunner();

      runner.register({
        name: "test",
        beforeExecution: beforeFn,
        afterExecution: afterFn,
      });

      const fn = vi.fn().mockResolvedValue({ data: "result", tokensUsed: 50 });
      const wrapped = runner.wrap("audience_analysis", "user-1", fn);

      const result = await wrapped("input-data");

      expect(result).toEqual({ data: "result", tokensUsed: 50 });
      expect(fn).toHaveBeenCalledWith("input-data");
      expect(beforeFn).toHaveBeenCalledTimes(1);
      expect(afterFn).toHaveBeenCalledWith(
        expect.objectContaining({
          agentType: "audience_analysis",
          userId: "user-1",
        }),
        "result",
        50
      );
    });

    it("calls onError on function failure", async () => {
      const onError = vi.fn();
      const runner = new PluginRunner();
      runner.register({ name: "test", onError });

      const fn = vi.fn().mockRejectedValue(new Error("agent failed"));
      const wrapped = runner.wrap("audience_analysis", "user-1", fn);

      await expect(wrapped("input")).rejects.toThrow("agent failed");
      expect(onError).toHaveBeenCalledTimes(1);
    });
  });
});

describe("TokenTrackingPlugin", () => {
  it("tracks token usage per user and agent type", async () => {
    const plugin = new TokenTrackingPlugin();

    await plugin.afterExecution(
      createContext({ userId: "user-1", agentType: "audience_analysis" }),
      {},
      100
    );
    await plugin.afterExecution(
      createContext({ userId: "user-1", agentType: "audience_analysis" }),
      {},
      200
    );
    await plugin.afterExecution(
      createContext({ userId: "user-2", agentType: "campaign_strategy" }),
      {},
      50
    );

    expect(plugin.getUsage("user-1", "audience_analysis")).toEqual({
      total: 300,
      count: 2,
    });
    expect(plugin.getUsage("user-2", "campaign_strategy")).toEqual({
      total: 50,
      count: 1,
    });
    expect(plugin.getUsage("user-3", "audience_analysis")).toEqual({
      total: 0,
      count: 0,
    });
  });

  it("getTotalUsage sums all usage", async () => {
    const plugin = new TokenTrackingPlugin();

    await plugin.afterExecution(createContext(), {}, 100);
    await plugin.afterExecution(createContext({ userId: "user-2" }), {}, 200);

    expect(plugin.getTotalUsage()).toBe(300);
  });
});

describe("DurationTrackingPlugin", () => {
  it("tracks execution duration per agent type", async () => {
    const plugin = new DurationTrackingPlugin();

    await plugin.afterExecution(
      createContext({
        agentType: "audience_analysis",
        startTime: Date.now() - 100,
      })
    );
    await plugin.afterExecution(
      createContext({
        agentType: "audience_analysis",
        startTime: Date.now() - 200,
      })
    );

    expect(plugin.getAverage("audience_analysis")).toBeGreaterThan(0);
    expect(plugin.getP95("audience_analysis")).toBeGreaterThan(0);
  });

  it("returns 0 for unknown agent type", () => {
    const plugin = new DurationTrackingPlugin();

    expect(plugin.getAverage("unknown")).toBe(0);
    expect(plugin.getP95("unknown")).toBe(0);
  });
});
