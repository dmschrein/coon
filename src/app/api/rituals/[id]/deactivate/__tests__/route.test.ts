import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../route";
import { ServiceError } from "@/lib/core/services";

const mockAuth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
}));

const mockDeactivate = vi.fn();
vi.mock("@/lib/core/di/container", () => ({
  getContainer: () => ({
    ritualService: {
      deactivate: (...args: unknown[]) => mockDeactivate(...args),
    },
  }),
}));

function makeRequest(): Request {
  return new Request("http://localhost/api/rituals/r1/deactivate", {
    method: "POST",
  });
}

describe("POST /api/rituals/[id]/deactivate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const res = await POST(makeRequest(), {
      params: Promise.resolve({ id: "r1" }),
    });
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns success on deactivate", async () => {
    mockAuth.mockResolvedValue({ userId: "u1" });
    mockDeactivate.mockResolvedValue(undefined);

    const res = await POST(makeRequest(), {
      params: Promise.resolve({ id: "r1" }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual({ deactivated: true });
    expect(mockDeactivate).toHaveBeenCalledWith("r1", "u1");
  });

  it("returns 404 when ritual is not found", async () => {
    mockAuth.mockResolvedValue({ userId: "u1" });
    mockDeactivate.mockRejectedValue(
      new ServiceError("Ritual template not found.", "NOT_FOUND")
    );

    const res = await POST(makeRequest(), {
      params: Promise.resolve({ id: "r1" }),
    });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
  });
});
