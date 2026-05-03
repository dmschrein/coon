import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../route";

const mockAuth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
}));

const mockListNotifications = vi.fn();
const mockCountUnread = vi.fn();
vi.mock("@/lib/core/di/container", () => ({
  getContainer: () => ({
    notificationRepo: {
      listNotifications: (...args: unknown[]) => mockListNotifications(...args),
      countUnread: (...args: unknown[]) => mockCountUnread(...args),
    },
  }),
}));

function createMockRequest(query = ""): Request {
  return new Request(
    `http://localhost:3000/api/notifications${query ? `?${query}` : ""}`
  );
}

const mockNotification = {
  id: "n-1",
  userId: "user_123",
  type: "post_trending",
  title: "Your post is trending",
  body: "Foo is at 12% engagement.",
  link: "/dashboard/campaigns/c1/content/p1",
  read: false,
  createdAt: new Date("2026-04-30T10:00:00Z"),
};

describe("GET /api/notifications", () => {
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

  it("returns items and unreadCount for authenticated user", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockListNotifications.mockResolvedValue([mockNotification]);
    mockCountUnread.mockResolvedValue(3);

    const response = await GET(createMockRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.items).toHaveLength(1);
    expect(data.data.unreadCount).toBe(3);
    expect(data.error).toBeNull();
    expect(mockListNotifications).toHaveBeenCalledWith("user_123", 10);
    expect(mockCountUnread).toHaveBeenCalledWith("user_123");
  });

  it("respects custom limit", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockListNotifications.mockResolvedValue([]);
    mockCountUnread.mockResolvedValue(0);

    await GET(createMockRequest("limit=25"));

    expect(mockListNotifications).toHaveBeenCalledWith("user_123", 25);
  });

  it("returns 400 for invalid limit", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });

    const response = await GET(createMockRequest("limit=999"));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error.code).toBe("VALIDATION_ERROR");
  });
});
