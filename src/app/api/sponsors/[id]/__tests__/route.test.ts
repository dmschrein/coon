import { describe, it, expect, vi, beforeEach } from "vitest";
import { PATCH, DELETE } from "../route";

const mockAuth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
}));

const mockGetSponsor = vi.fn();
const mockUpdateSponsor = vi.fn();
const mockDeleteSponsor = vi.fn();
vi.mock("@/lib/core/di/container", () => ({
  getContainer: () => ({
    sponsorRepo: {
      getSponsor: (...args: unknown[]) => mockGetSponsor(...args),
      updateSponsor: (...args: unknown[]) => mockUpdateSponsor(...args),
      deleteSponsor: (...args: unknown[]) => mockDeleteSponsor(...args),
    },
  }),
}));

const mockSponsor = {
  id: "sponsor-1",
  userId: "user_123",
  companyName: "Acme Corp",
  contactName: null,
  contactEmail: null,
  dealValue: 250000,
  status: "outreach",
  deliverables: null,
  startDate: null,
  endDate: null,
  notes: null,
  createdAt: new Date("2026-05-01T10:00:00Z"),
  updatedAt: new Date("2026-05-01T10:00:00Z"),
};

function paramsFor(id: string) {
  return { params: Promise.resolve({ id }) };
}

function patchRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/sponsors/sponsor-1", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("PATCH /api/sponsors/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const response = await PATCH(
      patchRequest({ status: "active" }),
      paramsFor("sponsor-1")
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error.code).toBe("UNAUTHORIZED");
  });

  it("updates sponsor status (drag-to-column flow)", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockGetSponsor.mockResolvedValue(mockSponsor);
    mockUpdateSponsor.mockResolvedValue({ ...mockSponsor, status: "active" });

    const response = await PATCH(
      patchRequest({ status: "active" }),
      paramsFor("sponsor-1")
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.status).toBe("active");
    expect(mockUpdateSponsor).toHaveBeenCalledWith("sponsor-1", {
      status: "active",
    });
  });

  it("returns 404 when sponsor belongs to another user", async () => {
    mockAuth.mockResolvedValue({ userId: "user_999" });
    mockGetSponsor.mockResolvedValue(mockSponsor);

    const response = await PATCH(
      patchRequest({ status: "active" }),
      paramsFor("sponsor-1")
    );
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error.code).toBe("NOT_FOUND");
  });

  it("returns 400 on invalid status value", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });

    const response = await PATCH(
      patchRequest({ status: "in_limbo" }),
      paramsFor("sponsor-1")
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("DELETE /api/sponsors/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const response = await DELETE(
      new Request("http://localhost"),
      paramsFor("sponsor-1")
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error.code).toBe("UNAUTHORIZED");
  });

  it("deletes sponsor for owner", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockGetSponsor.mockResolvedValue(mockSponsor);
    mockDeleteSponsor.mockResolvedValue(undefined);

    const response = await DELETE(
      new Request("http://localhost"),
      paramsFor("sponsor-1")
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.id).toBe("sponsor-1");
    expect(mockDeleteSponsor).toHaveBeenCalledWith("sponsor-1");
  });

  it("returns 404 when sponsor not found", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockGetSponsor.mockResolvedValue(null);

    const response = await DELETE(
      new Request("http://localhost"),
      paramsFor("missing")
    );
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error.code).toBe("NOT_FOUND");
    expect(mockDeleteSponsor).not.toHaveBeenCalled();
  });
});
