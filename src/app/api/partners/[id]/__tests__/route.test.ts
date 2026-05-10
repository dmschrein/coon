import { describe, it, expect, vi, beforeEach } from "vitest";
import { PATCH, DELETE } from "../route";

const mockAuth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
}));

const mockGetPartner = vi.fn();
const mockUpdatePartner = vi.fn();
const mockDeletePartner = vi.fn();
vi.mock("@/lib/core/di/container", () => ({
  getContainer: () => ({
    partnerRepo: {
      getPartner: (...args: unknown[]) => mockGetPartner(...args),
      updatePartner: (...args: unknown[]) => mockUpdatePartner(...args),
      deletePartner: (...args: unknown[]) => mockDeletePartner(...args),
    },
  }),
}));

const mockPartner = {
  id: "p1",
  userId: "user_123",
  name: "Indie Hackers",
  platform: "twitter",
  url: null,
  contactHandle: null,
  status: "prospect",
  collaborationIdeas: null,
  notes: null,
  createdAt: new Date("2026-05-01T10:00:00Z"),
  updatedAt: new Date("2026-05-01T10:00:00Z"),
};

function paramsFor(id: string) {
  return { params: Promise.resolve({ id }) };
}

function patchRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/partners/p1", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("PATCH /api/partners/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const response = await PATCH(
      patchRequest({ status: "active" }),
      paramsFor("p1")
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error.code).toBe("UNAUTHORIZED");
  });

  it("updates the partner and returns the new row", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockGetPartner.mockResolvedValue(mockPartner);
    mockUpdatePartner.mockResolvedValue({ ...mockPartner, status: "active" });

    const response = await PATCH(
      patchRequest({ status: "active" }),
      paramsFor("p1")
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.status).toBe("active");
    expect(data.error).toBeNull();
    expect(mockUpdatePartner).toHaveBeenCalledWith("p1", { status: "active" });
  });

  it("returns 404 when the partner does not exist", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockGetPartner.mockResolvedValue(null);

    const response = await PATCH(
      patchRequest({ status: "active" }),
      paramsFor("missing")
    );
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error.code).toBe("NOT_FOUND");
    expect(mockUpdatePartner).not.toHaveBeenCalled();
  });

  it("returns 404 when the partner belongs to another user", async () => {
    mockAuth.mockResolvedValue({ userId: "user_999" });
    mockGetPartner.mockResolvedValue(mockPartner);

    const response = await PATCH(
      patchRequest({ status: "active" }),
      paramsFor("p1")
    );
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error.code).toBe("NOT_FOUND");
    expect(mockUpdatePartner).not.toHaveBeenCalled();
  });

  it("returns 400 on invalid body", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });

    const response = await PATCH(
      patchRequest({ status: "not_real" }),
      paramsFor("p1")
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("DELETE /api/partners/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const response = await DELETE(
      new Request("http://localhost"),
      paramsFor("p1")
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error.code).toBe("UNAUTHORIZED");
  });

  it("deletes the partner for the owner", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockGetPartner.mockResolvedValue(mockPartner);
    mockDeletePartner.mockResolvedValue(undefined);

    const response = await DELETE(
      new Request("http://localhost"),
      paramsFor("p1")
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.id).toBe("p1");
    expect(data.error).toBeNull();
    expect(mockDeletePartner).toHaveBeenCalledWith("p1");
  });

  it("returns 404 when the partner does not exist", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockGetPartner.mockResolvedValue(null);

    const response = await DELETE(
      new Request("http://localhost"),
      paramsFor("missing")
    );
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error.code).toBe("NOT_FOUND");
    expect(mockDeletePartner).not.toHaveBeenCalled();
  });

  it("returns 404 when the partner belongs to another user", async () => {
    mockAuth.mockResolvedValue({ userId: "user_999" });
    mockGetPartner.mockResolvedValue(mockPartner);

    const response = await DELETE(
      new Request("http://localhost"),
      paramsFor("p1")
    );
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error.code).toBe("NOT_FOUND");
    expect(mockDeletePartner).not.toHaveBeenCalled();
  });
});
