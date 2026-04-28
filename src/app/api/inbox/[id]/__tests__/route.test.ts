import { describe, it, expect, vi, beforeEach } from "vitest";
import { PATCH } from "../route";

// Mock Clerk auth
const mockAuth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
}));

// Mock the DI container
const mockGetItem = vi.fn();
const mockUpdateStatus = vi.fn();
vi.mock("@/lib/core/di/container", () => ({
  getContainer: () => ({
    inboxRepo: {
      getItem: (...args: unknown[]) => mockGetItem(...args),
      updateStatus: (...args: unknown[]) => mockUpdateStatus(...args),
    },
  }),
}));

function createMockRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/inbox/item-1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
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

describe("PATCH /api/inbox/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const response = await PATCH(
      createMockRequest({ status: "read" }),
      makeParams("item-1")
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 404 when item does not exist", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockGetItem.mockResolvedValue(null);

    const response = await PATCH(
      createMockRequest({ status: "read" }),
      makeParams("nonexistent")
    );
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error.code).toBe("NOT_FOUND");
  });

  it("returns 404 when item belongs to different user", async () => {
    mockAuth.mockResolvedValue({ userId: "user_456" });
    mockGetItem.mockResolvedValue(mockItem);

    const response = await PATCH(
      createMockRequest({ status: "read" }),
      makeParams("item-1")
    );
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error.code).toBe("NOT_FOUND");
  });

  it("returns 400 for invalid status value", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });

    const response = await PATCH(
      createMockRequest({ status: "invalid" }),
      makeParams("item-1")
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error.code).toBe("VALIDATION_ERROR");
  });

  it("updates status successfully", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockGetItem.mockResolvedValue(mockItem);
    const updatedItem = { ...mockItem, status: "read" };
    mockUpdateStatus.mockResolvedValue(updatedItem);

    const response = await PATCH(
      createMockRequest({ status: "read" }),
      makeParams("item-1")
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.status).toBe("read");
    expect(data.error).toBeNull();
    expect(mockUpdateStatus).toHaveBeenCalledWith("item-1", "read");
  });

  it("updates to replied status", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockGetItem.mockResolvedValue(mockItem);
    const updatedItem = { ...mockItem, status: "replied" };
    mockUpdateStatus.mockResolvedValue(updatedItem);

    const response = await PATCH(
      createMockRequest({ status: "replied" }),
      makeParams("item-1")
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.status).toBe("replied");
    expect(data.error).toBeNull();
  });
});
