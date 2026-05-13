import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "../config/route";

const mockAuth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
}));

const mockGetConfig = vi.fn();
const mockUpsertConfig = vi.fn();
vi.mock("@/lib/core/di/container", () => ({
  getContainer: () => ({
    monetizationConfigRepo: {
      getConfig: (...args: unknown[]) => mockGetConfig(...args),
      upsertConfig: (...args: unknown[]) => mockUpsertConfig(...args),
    },
  }),
}));

function createGetRequest(): Request {
  return new Request("http://localhost:3000/api/monetization/config");
}

function createPostRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/monetization/config", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const validConfig = {
  selectedModels: ["paid_membership", "courses"] as const,
  completedAt: "2026-05-11T12:00:00.000Z",
};

describe("GET /api/monetization/config", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const response = await GET(createGetRequest());
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error.code).toBe("UNAUTHORIZED");
    expect(data.data).toBeNull();
  });

  it("returns { data: null } when no config exists for the authenticated user", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockGetConfig.mockResolvedValue(null);

    const response = await GET(createGetRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toBeNull();
    expect(body.error).toBeNull();
    expect(mockGetConfig).toHaveBeenCalledWith("user_123");
  });

  it("returns the previously saved config after a POST", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockGetConfig.mockResolvedValue(validConfig);

    const response = await GET(createGetRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual(validConfig);
    expect(body.data.selectedModels).toEqual(["paid_membership", "courses"]);
    expect(body.data.completedAt).toBe("2026-05-11T12:00:00.000Z");
    expect(body.error).toBeNull();
  });
});

describe("POST /api/monetization/config", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("saves a valid selectedModels array and returns it in { data: config }", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockUpsertConfig.mockResolvedValue(validConfig);

    const response = await POST(createPostRequest(validConfig));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual(validConfig);
    expect(body.error).toBeNull();
    expect(mockUpsertConfig).toHaveBeenCalledWith("user_123", validConfig);
  });

  it("saves an empty selectedModels array (empty selection is valid before wizard completion)", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    const emptyConfig = {
      selectedModels: [],
      completedAt: "2026-05-11T12:00:00.000Z",
    };
    mockUpsertConfig.mockResolvedValue(emptyConfig);

    const response = await POST(createPostRequest(emptyConfig));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.selectedModels).toEqual([]);
    expect(body.error).toBeNull();
    expect(mockUpsertConfig).toHaveBeenCalledWith("user_123", emptyConfig);
  });
});
