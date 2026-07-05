import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../hub/route";

const mockAuth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
}));

const mockGetConfig = vi.fn();
const mockListMembers = vi.fn();
const mockGetSequence = vi.fn();

vi.mock("@/lib/core/di/container", () => ({
  getContainer: () => ({
    communityConfigRepo: {
      getConfig: (...args: unknown[]) => mockGetConfig(...args),
    },
    platformMemberRepo: {
      listMembers: (...args: unknown[]) => mockListMembers(...args),
    },
    onboardingRepo: {
      getSequence: (...args: unknown[]) => mockGetSequence(...args),
    },
  }),
}));

function getRequest(): Request {
  return new Request("http://localhost:3000/api/community/hub");
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetConfig.mockResolvedValue(null);
  mockListMembers.mockResolvedValue({ items: [], total: 0 });
  mockGetSequence.mockResolvedValue(null);
});

describe("GET /api/community/hub", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const res = await GET(getRequest());
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
    expect(body.data).toBeNull();
  });

  it("returns empty hub state for a new user with no community_config", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });

    const res = await GET(getRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.error).toBeNull();
    expect(body.data).toEqual({
      hasManifesto: false,
      completedSetupGuides: [],
      hasRules: false,
      hasActiveOnboarding: false,
      memberCount: 0,
    });
    expect(mockGetConfig).toHaveBeenCalledWith("user_123");
  });

  it("derives each flag from the saved community_config and member table", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockGetConfig.mockResolvedValue({
      manifesto: { mission: "Bring makers together." },
      setupGuides: {
        discord: { completed: true },
        reddit: { completed: false },
      },
      rules: [{ title: "Be generous" }],
    });
    mockListMembers.mockResolvedValue({ items: [], total: 12 });
    mockGetSequence.mockResolvedValue({ isActive: true, steps: [] });

    const res = await GET(getRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual({
      hasManifesto: true,
      completedSetupGuides: ["discord"],
      hasRules: true,
      hasActiveOnboarding: true,
      memberCount: 12,
    });
  });
});
