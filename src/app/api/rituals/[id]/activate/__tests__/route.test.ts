import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../route";
import { ServiceError } from "@/lib/core/services";

const mockAuth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
}));

const mockActivate = vi.fn();
vi.mock("@/lib/core/di/container", () => ({
  getContainer: () => ({
    ritualService: {
      activate: (...args: unknown[]) => mockActivate(...args),
    },
  }),
}));

const validCampaignId = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/rituals/r1/activate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/rituals/[id]/activate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const res = await POST(makeRequest({ campaignId: validCampaignId }), {
      params: Promise.resolve({ id: "r1" }),
    });
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns activation result on success", async () => {
    mockAuth.mockResolvedValue({ userId: "u1" });
    mockActivate.mockResolvedValue({ ritualId: "clone-1", count: 8 });

    const res = await POST(makeRequest({ campaignId: validCampaignId }), {
      params: Promise.resolve({ id: "r1" }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toEqual({ ritualId: "clone-1", count: 8 });
    expect(mockActivate).toHaveBeenCalledWith("r1", "u1", validCampaignId);
  });

  it("returns 400 when campaignId is invalid", async () => {
    mockAuth.mockResolvedValue({ userId: "u1" });

    const res = await POST(makeRequest({ campaignId: "not-uuid" }), {
      params: Promise.resolve({ id: "r1" }),
    });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 404 when ritual is not found", async () => {
    mockAuth.mockResolvedValue({ userId: "u1" });
    mockActivate.mockRejectedValue(
      new ServiceError("Ritual template not found.", "NOT_FOUND")
    );

    const res = await POST(makeRequest({ campaignId: validCampaignId }), {
      params: Promise.resolve({ id: "r1" }),
    });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("returns 404 when campaign is not found", async () => {
    mockAuth.mockResolvedValue({ userId: "u1" });
    mockActivate.mockRejectedValue(
      new ServiceError("Campaign not found.", "CAMPAIGN_NOT_FOUND")
    );

    const res = await POST(makeRequest({ campaignId: validCampaignId }), {
      params: Promise.resolve({ id: "r1" }),
    });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe("CAMPAIGN_NOT_FOUND");
  });
});
