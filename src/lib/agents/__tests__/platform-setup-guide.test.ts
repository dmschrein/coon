import { describe, it, expect, vi, beforeEach } from "vitest";
import { generatePlatformSetupGuide } from "../platform-setup-guide";
import {
  discordSetupGuideFixture,
  redditSetupGuideFixture,
  discordSetupGuideInputFixture,
  redditSetupGuideInputFixture,
} from "../__fixtures__/setup-guide";
import type { SetupGuideOutput } from "@/types";

// ----------------------------------------------------------------------------
// Agent tests — mock the Claude client, return a per-platform fixture.
// ----------------------------------------------------------------------------

vi.mock("@/lib/claude", () => ({
  anthropic: {
    messages: {
      create: vi.fn(),
    },
  },
}));

import { anthropic } from "@/lib/claude";
const mockCreate = vi.mocked(anthropic.messages.create);

function mockClaudeResponse(payload: unknown) {
  mockCreate.mockResolvedValue({
    content: [{ type: "text", text: JSON.stringify(payload) }],
    usage: { input_tokens: 500, output_tokens: 1200 },
  } as Awaited<ReturnType<typeof anthropic.messages.create>>);
}

/** Distinct Discord channel names (#channel) referenced anywhere in the guide. */
function distinctChannelNames(guide: SetupGuideOutput): Set<string> {
  const names = new Set<string>();
  for (const section of guide.checklist) {
    for (const step of section.steps) {
      const haystack = `${step.text}\n${step.copyReady ?? ""}`;
      for (const match of haystack.matchAll(/#[a-z0-9][a-z0-9-]*/gi)) {
        names.add(match[0].toLowerCase());
      }
    }
  }
  return names;
}

describe("generatePlatformSetupGuide", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Discord guide has at least 4 sections in the checklist", async () => {
    mockClaudeResponse(discordSetupGuideFixture);
    const { guide } = await generatePlatformSetupGuide(
      discordSetupGuideInputFixture
    );
    expect(guide.checklist.length).toBeGreaterThanOrEqual(4);
  });

  it("Discord checklist includes at least 3 distinct channel names across steps", async () => {
    mockClaudeResponse(discordSetupGuideFixture);
    const { guide } = await generatePlatformSetupGuide(
      discordSetupGuideInputFixture
    );
    expect(distinctChannelNames(guide).size).toBeGreaterThanOrEqual(3);
  });

  it("Discord guide has a non-empty welcomeMessage string", async () => {
    mockClaudeResponse(discordSetupGuideFixture);
    const { guide } = await generatePlatformSetupGuide(
      discordSetupGuideInputFixture
    );
    expect(typeof guide.welcomeMessage).toBe("string");
    expect(guide.welcomeMessage.trim().length).toBeGreaterThan(0);
  });

  it("estimatedTotalMinutes is a positive integer", async () => {
    mockClaudeResponse(discordSetupGuideFixture);
    const { guide } = await generatePlatformSetupGuide(
      discordSetupGuideInputFixture
    );
    expect(Number.isInteger(guide.estimatedTotalMinutes)).toBe(true);
    expect(guide.estimatedTotalMinutes).toBeGreaterThan(0);
  });

  it("every copyReady field present is a non-empty string", async () => {
    mockClaudeResponse(discordSetupGuideFixture);
    const { guide } = await generatePlatformSetupGuide(
      discordSetupGuideInputFixture
    );
    for (const section of guide.checklist) {
      for (const step of section.steps) {
        if (step.copyReady !== undefined) {
          expect(typeof step.copyReady).toBe("string");
          expect(step.copyReady.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("Reddit guide includes a subreddit name recommendation in at least one step", async () => {
    mockClaudeResponse(redditSetupGuideFixture);
    const { guide } = await generatePlatformSetupGuide(
      redditSetupGuideInputFixture
    );
    const hasSubreddit = guide.checklist.some((section) =>
      section.steps.some((step) => /r\/[A-Za-z0-9_]+/.test(step.text))
    );
    expect(hasSubreddit).toBe(true);
  });

  it("derives estimatedTotalMinutes as the sum of every step's minutes", async () => {
    mockClaudeResponse(discordSetupGuideFixture);
    const { guide } = await generatePlatformSetupGuide(
      discordSetupGuideInputFixture
    );
    const expected = discordSetupGuideFixture.checklist.reduce(
      (total, section) =>
        total +
        section.steps.reduce((sum, step) => sum + step.estimatedMinutes, 0),
      0
    );
    expect(guide.estimatedTotalMinutes).toBe(expected);
  });
});

// ----------------------------------------------------------------------------
// Route tests — POST persists the generated guide (completed=false); PATCH marks
// a platform complete once every step is checked.
// ----------------------------------------------------------------------------

const mockAuth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
}));

const mockGetConfig = vi.fn();
const mockUpsertConfig = vi.fn();
const mockFindProfile = vi.fn();

vi.mock("@/lib/core/di/container", () => ({
  getContainer: () => ({
    communityConfigRepo: {
      getConfig: (...args: unknown[]) => mockGetConfig(...args),
      upsertConfig: (...args: unknown[]) => mockUpsertConfig(...args),
    },
    profileRepo: {
      findActiveByUserId: (...args: unknown[]) => mockFindProfile(...args),
    },
    communityPipeline: {
      executeStep: async (
        _type: string,
        input: unknown,
        fn: (i: unknown) => Promise<{ data: unknown; tokensUsed: number }>
      ) => {
        const r = await fn(input);
        return {
          data: r.data,
          tokensUsed: r.tokensUsed,
          durationMs: 0,
          cached: false,
        };
      },
    },
  }),
}));

// The route runs the REAL agent against the already-mocked Claude client, so we
// don't mock the agent module here (a module mock would be hoisted file-wide and
// clobber the agent tests above). logAgentRun is mocked to avoid a real DB write.
vi.mock("@/lib/agents/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/agents/utils")>();
  return { ...actual, logAgentRun: vi.fn() };
});

import { POST, PATCH } from "@/app/api/community/setup-guide/route";
import { audienceProfileFixture } from "../__fixtures__/audience";
import { setupGuideStepKeys } from "@/lib/community/setup-guide-progress";
import type { SetupGuideProgress } from "@/types";

const guideOutputFixture: SetupGuideOutput = {
  ...discordSetupGuideFixture,
  estimatedTotalMinutes: 43,
};

function request(method: string, body: unknown): Request {
  return new Request("http://localhost:3000/api/community/setup-guide", {
    method,
    body: JSON.stringify(body ?? {}),
    headers: { "Content-Type": "application/json" },
  });
}

const postRequest = (body: unknown) => request("POST", body);
const patchRequest = (body: unknown) => request("PATCH", body);

describe("POST /api/community/setup-guide", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockFindProfile.mockResolvedValue({ profileData: audienceProfileFixture });
    mockGetConfig.mockResolvedValue({
      manifesto: { nameSuggestions: ["The Pre-Launch Pact"] },
    });
    mockUpsertConfig.mockImplementation((_id, patch) => patch);
    // Real agent runs against the mocked Claude client and returns the Discord guide.
    mockClaudeResponse(discordSetupGuideFixture);
  });

  it("persists the generated guide with no steps completed yet", async () => {
    let savedPatch:
      | { setupGuides?: Record<string, SetupGuideProgress> }
      | undefined;
    mockUpsertConfig.mockImplementation((_id, patch) => {
      savedPatch = patch;
      return patch;
    });

    const res = await POST(postRequest({ platform: "discord" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.error).toBeNull();
    // The guide is saved, but generating it does NOT mark the platform complete.
    const saved = savedPatch?.setupGuides?.discord;
    expect(saved?.guide).toEqual(guideOutputFixture);
    expect(saved?.completedSteps).toEqual([]);
    expect(saved?.completed).toBe(false);
    expect(body.data.completed).toBe(false);
    expect(body.data.guide).toEqual(guideOutputFixture);
  });

  it("is idempotent — returns the existing guide without regenerating", async () => {
    mockGetConfig.mockResolvedValue({
      setupGuides: {
        discord: {
          guide: guideOutputFixture,
          completedSteps: ["0:0"],
          completed: false,
        },
      },
    });

    const res = await POST(postRequest({ platform: "discord" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.completedSteps).toEqual(["0:0"]);
    // No regeneration, no overwrite of saved progress.
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockUpsertConfig).not.toHaveBeenCalled();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });
    const res = await POST(postRequest({ platform: "discord" }));
    const body = await res.json();
    expect(res.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });
});

describe("PATCH /api/community/setup-guide", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockGetConfig.mockResolvedValue({
      setupGuides: {
        discord: {
          guide: guideOutputFixture,
          completedSteps: [],
          completed: false,
        },
      },
    });
    mockUpsertConfig.mockImplementation((_id, patch) => patch);
  });

  it("marks the platform complete only when every step is checked", async () => {
    const allKeys = setupGuideStepKeys(guideOutputFixture);

    const res = await PATCH(
      patchRequest({ platform: "discord", completedSteps: allKeys })
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.completed).toBe(true);
    expect(mockUpsertConfig).toHaveBeenCalledWith(
      "user_123",
      expect.objectContaining({
        setupGuides: expect.objectContaining({
          discord: expect.objectContaining({ completed: true }),
        }),
      })
    );
  });

  it("stays incomplete when only some steps are checked", async () => {
    const res = await PATCH(
      patchRequest({ platform: "discord", completedSteps: ["0:0"] })
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.completed).toBe(false);
    expect(body.data.completedSteps).toEqual(["0:0"]);
  });

  it("400s when there is no generated guide to update", async () => {
    mockGetConfig.mockResolvedValue({ setupGuides: {} });
    const res = await PATCH(
      patchRequest({ platform: "discord", completedSteps: [] })
    );
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error.code).toBe("NO_GUIDE");
  });
});
