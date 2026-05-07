import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../route";

// Mock Clerk auth
const mockAuth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
}));

// Mock the DI container
const mockListItems = vi.fn();
vi.mock("@/lib/core/di/container", () => ({
  getContainer: () => ({
    inboxRepo: {
      listItems: (...args: unknown[]) => mockListItems(...args),
    },
  }),
}));

function createMockRequest(query = ""): Request {
  return new Request(
    `http://localhost:3000/api/inbox${query ? `?${query}` : ""}`
  );
}

const mockItem = {
  id: "item-1",
  userId: "user_123",
  campaignId: null,
  contentId: null,
  platform: "instagram",
  authorHandle: "@testuser",
  authorDisplayName: "Test User",
  messageText: "Great post!",
  messageType: "comment",
  status: "unread",
  platformMessageId: "ig_123",
  receivedAt: new Date("2026-04-28T10:00:00Z"),
  createdAt: new Date("2026-04-28T10:00:00Z"),
};

describe("GET /api/inbox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const response = await GET(createMockRequest());
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error.code).toBe("UNAUTHORIZED");
  });

  it("returns paginated inbox items for authenticated user", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockListItems.mockResolvedValue({ items: [mockItem], total: 1 });

    const response = await GET(createMockRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.items).toHaveLength(1);
    expect(data.data.total).toBe(1);
    expect(data.data.page).toBe(1);
    expect(data.data.limit).toBe(20);
    expect(data.error).toBeNull();
    expect(mockListItems).toHaveBeenCalledWith({
      userId: "user_123",
      page: 1,
      limit: 20,
    });
  });

  it("passes filter params to repository", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockListItems.mockResolvedValue({ items: [], total: 0 });

    const response = await GET(
      createMockRequest("status=unread&platform=instagram&page=2&limit=10")
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.items).toEqual([]);
    expect(data.data.total).toBe(0);
    expect(data.data.page).toBe(2);
    expect(data.data.limit).toBe(10);
    expect(mockListItems).toHaveBeenCalledWith({
      userId: "user_123",
      status: "unread",
      platform: "instagram",
      page: 2,
      limit: 10,
    });
  });

  it("returns 400 for invalid status filter", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });

    const response = await GET(createMockRequest("status=invalid"));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns empty array when no items exist", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockListItems.mockResolvedValue({ items: [], total: 0 });

    const response = await GET(createMockRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.items).toEqual([]);
    expect(data.data.total).toBe(0);
  });
});
