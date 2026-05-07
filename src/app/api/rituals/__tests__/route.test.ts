import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../route";

const mockAuth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
}));

const mockListTemplates = vi.fn();
vi.mock("@/lib/core/di/container", () => ({
  getContainer: () => ({
    ritualService: {
      listTemplates: (...args: unknown[]) => mockListTemplates(...args),
    },
  }),
}));

describe("GET /api/rituals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns the list of templates", async () => {
    mockAuth.mockResolvedValue({ userId: "u1" });
    mockListTemplates.mockResolvedValue([
      { id: "r1", name: "Monday Wins", isActive: false },
    ]);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.items).toHaveLength(1);
    expect(body.data.items[0].name).toBe("Monday Wins");
    expect(mockListTemplates).toHaveBeenCalledWith("u1");
  });

  it("returns 500 on unexpected error", async () => {
    mockAuth.mockResolvedValue({ userId: "u1" });
    mockListTemplates.mockRejectedValue(new Error("boom"));

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error.code).toBe("INTERNAL_ERROR");
  });
});
