import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock the DB so importing the container doesn't require a real connection.
vi.mock("@/lib/db", () => ({
  db: {} as unknown,
}));

// Mock the Claude client so importing agent modules doesn't instantiate the
// Anthropic SDK (which throws in the jsdom/browser-like test environment).
vi.mock("@/lib/claude", () => ({
  anthropic: { messages: { create: vi.fn() } },
}));

import { getContainer, resetContainer } from "../container";
import { AgentPipeline } from "@/lib/orchestration";
import {
  DrizzleCampaignRepository,
  DrizzleAudienceProfileRepository,
  DrizzleRevenueRepository,
} from "../../repositories";
import { AudienceService } from "../../services/audience-service";
import { CampaignService } from "../../services/campaign-service";
import { WorkflowService } from "../../services/workflow-service";

describe("getContainer", () => {
  beforeEach(() => {
    resetContainer();
  });

  afterEach(() => {
    resetContainer();
  });

  it("returns a container instance", () => {
    const container = getContainer();
    expect(container).toBeDefined();
  });

  it("wires repositories as Drizzle implementations", () => {
    const container = getContainer();
    expect(container.campaignRepo).toBeInstanceOf(DrizzleCampaignRepository);
    expect(container.profileRepo).toBeInstanceOf(
      DrizzleAudienceProfileRepository
    );
    expect(container.revenueRepo).toBeInstanceOf(DrizzleRevenueRepository);
  });

  it("wires services with their dependencies", () => {
    const container = getContainer();
    expect(container.audienceService).toBeInstanceOf(AudienceService);
    expect(container.campaignService).toBeInstanceOf(CampaignService);
    expect(container.workflowService).toBeInstanceOf(WorkflowService);
  });

  it("provides isolated orchestration pipelines", () => {
    const container = getContainer();
    expect(container.monetizationPipeline).toBeInstanceOf(AgentPipeline);
    expect(container.communityPipeline).toBeInstanceOf(AgentPipeline);
    // Each pipeline gets its own orchestration stack
    expect(container.monetizationPipeline).not.toBe(
      container.communityPipeline
    );
  });

  it("registers token and duration plugins on the plugin runner", () => {
    const container = getContainer();
    expect(container.pluginRunner).toBeDefined();
    expect(container.tokenPlugin).toBeDefined();
    expect(container.durationPlugin).toBeDefined();
  });

  it("memoizes the container as a singleton", () => {
    const a = getContainer();
    const b = getContainer();
    expect(a).toBe(b);
  });

  it("creates a fresh container after resetContainer", () => {
    const a = getContainer();
    resetContainer();
    const b = getContainer();
    expect(a).not.toBe(b);
  });
});
