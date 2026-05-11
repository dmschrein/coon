import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "../route";

const mockAuth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
}));

const mockListProspects = vi.fn();
const mockCreateProspect = vi.fn();
vi.mock("@/lib/core/di/container", () => ({
  getContainer: () => ({
    prospectRepo: {
      listProspects: (...args: unknown[]) => mockListProspects(...args),
      createProspect: (...args: unknown[]) => mockCreateProspect(...args),
    },
  }),
}));

function createGetRequest(query = ""): Request {
  return new Request(
    `http://localhost:3000/api/prospects${query ? `?${query}` : ""}`
  );
}

function createPostRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/prospects", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

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

describe("GET /api/prospects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const response = await GET(createGetRequest());
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error.code).toBe("UNAUTHORIZED");
  });

  it("returns paginated prospects for authenticated user", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockListProspects.mockResolvedValue({ items: [mockProspect], total: 1 });

    const response = await GET(createGetRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.items).toHaveLength(1);
    expect(data.data.total).toBe(1);
    expect(data.data.page).toBe(1);
    expect(data.data.limit).toBe(20);
    expect(data.error).toBeNull();
    expect(mockListProspects).toHaveBeenCalledWith("user_123", {
      status: undefined,
      platform: undefined,
      source: undefined,
      page: 1,
      limit: 20,
    });
  });

  it("filters by status=contacted", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockListProspects.mockResolvedValue({ items: [], total: 0 });

    await GET(createGetRequest("status=contacted"));

    expect(mockListProspects).toHaveBeenCalledWith(
      "user_123",
      expect.objectContaining({ status: "contacted" })
    );
  });

  it("passes platform and source filters", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockListProspects.mockResolvedValue({ items: [], total: 0 });

    await GET(createGetRequest("platform=reddit&source=import"));

    expect(mockListProspects).toHaveBeenCalledWith(
      "user_123",
      expect.objectContaining({ platform: "reddit", source: "import" })
    );
  });

  it("returns 400 for invalid status filter", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });

    const response = await GET(createGetRequest("status=invalid"));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("POST /api/prospects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const response = await POST(
      createPostRequest({ handle: "alice", platform: "twitter" })
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error.code).toBe("UNAUTHORIZED");
  });

  it("creates prospect with valid body", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockCreateProspect.mockResolvedValue(mockProspect);

    const response = await POST(
      createPostRequest({
        handle: "alice",
        platform: "twitter",
        source: "manual",
      })
    );
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.data.id).toBe("prospect-1");
    expect(mockCreateProspect).toHaveBeenCalledWith({
      userId: "user_123",
      handle: "alice",
      platform: "twitter",
      source: "manual",
      notes: undefined,
      tags: undefined,
      convertedFromContentId: undefined,
    });
  });

  it("returns 409 when prospect already exists", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockCreateProspect.mockResolvedValue(null);

    const response = await POST(
      createPostRequest({ handle: "alice", platform: "twitter" })
    );
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error.code).toBe("CONFLICT");
  });

  it("returns 400 on invalid body", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });

    const response = await POST(createPostRequest({ handle: "alice" }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error.code).toBe("VALIDATION_ERROR");
  });
});
