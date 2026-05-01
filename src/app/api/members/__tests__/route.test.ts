import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "../route";

const mockAuth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
}));

const mockListMembers = vi.fn();
const mockCreateMember = vi.fn();
vi.mock("@/lib/core/di/container", () => ({
  getContainer: () => ({
    platformMemberRepo: {
      listMembers: (...args: unknown[]) => mockListMembers(...args),
      createMember: (...args: unknown[]) => mockCreateMember(...args),
    },
  }),
}));

function createGetRequest(query = ""): Request {
  return new Request(
    `http://localhost:3000/api/members${query ? `?${query}` : ""}`
  );
}

function createPostRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/members", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const mockMember = {
  id: "member-1",
  userId: "user_123",
  platform: "instagram",
  platformUserId: "ig_user_1",
  username: "alice",
  displayName: "Alice",
  firstSeenAt: new Date("2026-04-28T10:00:00Z"),
  engagementCount: 1,
  lastSeenAt: new Date("2026-04-28T10:00:00Z"),
  status: "prospect",
  tags: [],
  notes: null,
};

describe("GET /api/members", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const response = await GET(createGetRequest());
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error.code).toBe("UNAUTHORIZED");
  });

  it("returns paginated members for authenticated user", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockListMembers.mockResolvedValue({ items: [mockMember], total: 1 });

    const response = await GET(createGetRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.items).toHaveLength(1);
    expect(data.data.total).toBe(1);
    expect(data.data.page).toBe(1);
    expect(data.data.limit).toBe(20);
    expect(data.error).toBeNull();
    expect(mockListMembers).toHaveBeenCalledWith("user_123", {
      status: undefined,
      platform: undefined,
      minEngagement: undefined,
      page: 1,
      limit: 20,
    });
  });

  it("filters by status=advocate", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockListMembers.mockResolvedValue({
      items: [{ ...mockMember, status: "advocate" }],
      total: 1,
    });

    const response = await GET(createGetRequest("status=advocate"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.items[0].status).toBe("advocate");
    expect(mockListMembers).toHaveBeenCalledWith(
      "user_123",
      expect.objectContaining({ status: "advocate" })
    );
  });

  it("passes platform and minEngagement filters", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockListMembers.mockResolvedValue({ items: [], total: 0 });

    await GET(createGetRequest("platform=instagram&minEngagement=5"));

    expect(mockListMembers).toHaveBeenCalledWith(
      "user_123",
      expect.objectContaining({
        platform: "instagram",
        minEngagement: 5,
      })
    );
  });

  it("returns 400 for invalid status filter", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });

    const response = await GET(createGetRequest("status=invalid"));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("POST /api/members", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const response = await POST(
      createPostRequest({
        platform: "instagram",
        platformUserId: "ig_user_1",
        username: "alice",
      })
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error.code).toBe("UNAUTHORIZED");
  });

  it("creates member with valid body", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockCreateMember.mockResolvedValue(mockMember);

    const response = await POST(
      createPostRequest({
        platform: "instagram",
        platformUserId: "ig_user_1",
        username: "alice",
        displayName: "Alice",
      })
    );
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.data.id).toBe("member-1");
    expect(mockCreateMember).toHaveBeenCalledWith({
      userId: "user_123",
      platform: "instagram",
      platformUserId: "ig_user_1",
      username: "alice",
      displayName: "Alice",
    });
  });

  it("returns 409 when member already exists", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockCreateMember.mockResolvedValue(null);

    const response = await POST(
      createPostRequest({
        platform: "instagram",
        platformUserId: "ig_user_1",
        username: "alice",
      })
    );
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error.code).toBe("CONFLICT");
  });

  it("returns 400 on invalid body", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });

    const response = await POST(
      createPostRequest({
        platform: "instagram",
      })
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error.code).toBe("VALIDATION_ERROR");
  });
});
