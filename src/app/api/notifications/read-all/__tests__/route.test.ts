import { describe, it, expect, vi, beforeEach } from "vitest";
import { PATCH } from "../route";

const mockAuth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
}));

const mockMarkAllRead = vi.fn();
vi.mock("@/lib/core/di/container", () => ({
  getContainer: () => ({
    notificationRepo: {
      markAllRead: (...args: unknown[]) => mockMarkAllRead(...args),
    },
  }),
}));

describe("PATCH /api/notifications/read-all", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });
    const response = await PATCH();
    const data = await response.json();
    expect(response.status).toBe(401);
    expect(data.error.code).toBe("UNAUTHORIZED");
    expect(mockMarkAllRead).not.toHaveBeenCalled();
  });

  it("marks all notifications read for authenticated user", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockMarkAllRead.mockResolvedValue(undefined);

    const response = await PATCH();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.success).toBe(true);
    expect(data.error).toBeNull();
    expect(mockMarkAllRead).toHaveBeenCalledWith("user_123");
  });
});
