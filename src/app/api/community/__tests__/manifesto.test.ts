import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "../manifesto/route";
import { manifestoOutputFixture } from "@/lib/agents/__fixtures__/manifesto";
import { quizFixture } from "@/lib/agents/__fixtures__/quiz";
import type { ManifestoOutput } from "@/types";

const mockAuth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
}));

const mockGetConfig = vi.fn();
const mockUpsertConfig = vi.fn();
const mockFindQuiz = vi.fn();
const mockFindProfile = vi.fn();

vi.mock("@/lib/core/di/container", () => ({
  getContainer: () => ({
    communityConfigRepo: {
      getConfig: (...args: unknown[]) => mockGetConfig(...args),
      upsertConfig: (...args: unknown[]) => mockUpsertConfig(...args),
    },
    quizRepo: {
      findLatestByUserId: (...args: unknown[]) => mockFindQuiz(...args),
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

const mockGenerate = vi.fn();
vi.mock("@/lib/agents/manifesto-generator", () => ({
  generateManifesto: (...args: unknown[]) => mockGenerate(...args),
}));

vi.mock("@/lib/agents/utils", () => ({
  logAgentRun: vi.fn(),
}));

function getRequest(): Request {
  return new Request("http://localhost:3000/api/community/manifesto");
}

function postRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/community/manifesto", {
    method: "POST",
    body: JSON.stringify(body ?? {}),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFindQuiz.mockResolvedValue({ id: "quiz_1", responseData: quizFixture });
  mockFindProfile.mockResolvedValue({
    profileData: { brandVoice: { summary: "Direct, empowering, zero fluff" } },
  });
  mockGenerate.mockResolvedValue({
    manifesto: manifestoOutputFixture,
    modelUsed: "claude-sonnet-4-20250514",
    tokensUsed: 1300,
  });
});

describe("GET /api/community/manifesto", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });
    const res = await GET(getRequest());
    const body = await res.json();
    expect(res.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
    expect(body.data).toBeNull();
  });

  it("returns the saved manifesto after a POST has been made", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockGetConfig.mockResolvedValue({ manifesto: manifestoOutputFixture });

    const res = await GET(getRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data).toEqual(manifestoOutputFixture);
    expect(mockGetConfig).toHaveBeenCalledWith("user_123");
  });

  it("returns null when no manifesto has been saved yet", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockGetConfig.mockResolvedValue(null);

    const res = await GET(getRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toBeNull();
  });
});

describe("POST /api/community/manifesto", () => {
  it("generates and persists the full manifesto", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockGetConfig.mockResolvedValue(null);
    mockUpsertConfig.mockImplementation((_id, config) => config);

    const res = await POST(postRequest({}));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data).toEqual(manifestoOutputFixture);
    expect(mockUpsertConfig).toHaveBeenCalledWith(
      "user_123",
      expect.objectContaining({ manifesto: manifestoOutputFixture })
    );
  });

  it("with regenerate=true for a specific section only replaces that section", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });

    const existing: ManifestoOutput = manifestoOutputFixture;
    mockGetConfig.mockResolvedValue({ manifesto: existing });

    // The freshly generated manifesto differs in every section.
    const regenerated: ManifestoOutput = {
      ...existing,
      mission: "A brand-new mission produced by regeneration.",
      whoFor: "Different who-for that must NOT be saved.",
      nameSuggestions: ["Different A", "Different B", "Different C"],
    };
    mockGenerate.mockResolvedValue({
      manifesto: regenerated,
      modelUsed: "claude-sonnet-4-20250514",
      tokensUsed: 500,
    });

    let savedConfig: { manifesto: ManifestoOutput } | undefined;
    mockUpsertConfig.mockImplementation((_id, config) => {
      savedConfig = config;
      return config;
    });

    const res = await POST(
      postRequest({ regenerate: true, section: "mission" })
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    // Only the mission changed; everything else is unchanged from `existing`.
    expect(savedConfig?.manifesto.mission).toBe(regenerated.mission);
    expect(savedConfig?.manifesto.whoFor).toBe(existing.whoFor);
    expect(savedConfig?.manifesto.nameSuggestions).toEqual(
      existing.nameSuggestions
    );
    expect(savedConfig?.manifesto.values).toEqual(existing.values);
    expect(body.data.mission).toBe(regenerated.mission);
    expect(body.data.whoFor).toBe(existing.whoFor);
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });
    const res = await POST(postRequest({}));
    const body = await res.json();
    expect(res.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });
});
