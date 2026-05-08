import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PATCH, DELETE } from "../route";

const mockAuth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
}));

const mockGetProspect = vi.fn();
const mockUpdateProspect = vi.fn();
const mockDeleteProspect = vi.fn();
vi.mock("@/lib/core/di/container", () => ({
  getContainer: () => ({
    prospectRepo: {
      getProspect: (...args: unknown[]) => mockGetProspect(...args),
      updateProspect: (...args: unknown[]) => mockUpdateProspect(...args),
      deleteProspect: (...args: unknown[]) => mockDeleteProspect(...args),
    },
  }),
}));

const mockProspect = {
  id: "prospect-1",
  userId: "user_123",
  handle: "alice",
  platform: "twitter",
  source: "manual",
  status: "cold",
  notes: null,
  tags: [],
  lastContactedAt: null,
  contactedCount: 0,
  convertedFromContentId: null,
  createdAt: new Date("2026-05-01T10:00:00Z"),
  updatedAt: new Date("2026-05-01T10:00:00Z"),
};

function paramsFor(id: string) {
  return { params: Promise.resolve({ id }) };
}

function patchRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/prospects/prospect-1", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("GET /api/prospects/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const response = await GET(
      new Request("http://localhost"),
      paramsFor("prospect-1")
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error.code).toBe("UNAUTHORIZED");
  });

  it("returns prospect by id for owner", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockGetProspect.mockResolvedValue(mockProspect);

    const response = await GET(
      new Request("http://localhost"),
      paramsFor("prospect-1")
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.id).toBe("prospect-1");
    expect(mockGetProspect).toHaveBeenCalledWith("prospect-1");
  });

  it("returns 404 when prospect belongs to another user", async () => {
    mockAuth.mockResolvedValue({ userId: "user_999" });
    mockGetProspect.mockResolvedValue(mockProspect);

    const response = await GET(
      new Request("http://localhost"),
      paramsFor("prospect-1")
    );
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error.code).toBe("NOT_FOUND");
  });

  it("returns 404 when prospect does not exist", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockGetProspect.mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost"),
      paramsFor("missing")
    );
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error.code).toBe("NOT_FOUND");
  });
});

describe("PATCH /api/prospects/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const response = await PATCH(
      patchRequest({ tags: ["vip"] }),
      paramsFor("prospect-1")
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error.code).toBe("UNAUTHORIZED");
  });

  it("updates status to contacted (repo handles timestamp + counter)", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockGetProspect.mockResolvedValue(mockProspect);
    const contactedAt = new Date("2026-05-07T12:00:00Z");
    mockUpdateProspect.mockResolvedValue({
      ...mockProspect,
      status: "contacted",
      lastContactedAt: contactedAt,
      contactedCount: 1,
    });

    const response = await PATCH(
      patchRequest({ status: "contacted" }),
      paramsFor("prospect-1")
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.status).toBe("contacted");
    expect(data.data.contactedCount).toBe(1);
    expect(data.data.lastContactedAt).toBeTruthy();
    // Route forwards the patch as-is; the repo applies side effects.
    expect(mockUpdateProspect).toHaveBeenCalledWith("prospect-1", {
      status: "contacted",
    });
  });

  it("updates tags array", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockGetProspect.mockResolvedValue(mockProspect);
    mockUpdateProspect.mockResolvedValue({ ...mockProspect, tags: ["vip"] });

    const response = await PATCH(
      patchRequest({ tags: ["vip"] }),
      paramsFor("prospect-1")
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.tags).toEqual(["vip"]);
  });

  it("returns 404 when prospect does not exist", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockGetProspect.mockResolvedValue(null);

    const response = await PATCH(
      patchRequest({ status: "contacted" }),
      paramsFor("missing")
    );
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error.code).toBe("NOT_FOUND");
  });

  it("returns 400 on invalid body", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });

    const response = await PATCH(
      patchRequest({ status: "invalid_status" }),
      paramsFor("prospect-1")
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when no fields provided", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });

    const response = await PATCH(patchRequest({}), paramsFor("prospect-1"));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("DELETE /api/prospects/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const response = await DELETE(
      new Request("http://localhost"),
      paramsFor("prospect-1")
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error.code).toBe("UNAUTHORIZED");
  });

  it("deletes prospect for owner", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockGetProspect.mockResolvedValue(mockProspect);
    mockDeleteProspect.mockResolvedValue(undefined);

    const response = await DELETE(
      new Request("http://localhost"),
      paramsFor("prospect-1")
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.id).toBe("prospect-1");
    expect(mockDeleteProspect).toHaveBeenCalledWith("prospect-1");
  });

  it("returns 404 when prospect not found", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockGetProspect.mockResolvedValue(null);

    const response = await DELETE(
      new Request("http://localhost"),
      paramsFor("missing")
    );
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error.code).toBe("NOT_FOUND");
    expect(mockDeleteProspect).not.toHaveBeenCalled();
  });
});
