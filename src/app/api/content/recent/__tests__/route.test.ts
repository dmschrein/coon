import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../route";

const mockAuth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
}));

const mockFindRecent = vi.fn();
vi.mock("@/lib/core/di/container", () => ({
  getContainer: () => ({
    contentRepo: {
      findRecentByUserId: (...args: unknown[]) => mockFindRecent(...args),
    },
  }),
}));

function createRequest(query = ""): Request {
  return new Request(
    `http://localhost:3000/api/content/recent${query ? `?${query}` : ""}`
  );
}

const sampleRow = {
  id: "content-1",
  title: "Hello world",
  platform: "twitter",
  pillar: "education",
};

describe("GET /api/content/recent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const response = await GET(createRequest());
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error.code).toBe("UNAUTHORIZED");
  });

  it("returns recent content for authenticated user with default limit 20", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockFindRecent.mockResolvedValue([sampleRow]);

    const response = await GET(createRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toEqual([sampleRow]);
    expect(data.error).toBeNull();
    expect(mockFindRecent).toHaveBeenCalledWith("user_123", 20);
  });

  it("respects an explicit limit", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockFindRecent.mockResolvedValue([]);

    await GET(createRequest("limit=5"));

    expect(mockFindRecent).toHaveBeenCalledWith("user_123", 5);
  });

  it("returns 400 when limit exceeds 50", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });

    const response = await GET(createRequest("limit=999"));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when limit is negative", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });

    const response = await GET(createRequest("limit=-1"));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error.code).toBe("VALIDATION_ERROR");
  });
});
