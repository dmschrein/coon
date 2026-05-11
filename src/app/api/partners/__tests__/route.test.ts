import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "../route";

const mockAuth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
}));

const mockListPartners = vi.fn();
const mockCreatePartner = vi.fn();
vi.mock("@/lib/core/di/container", () => ({
  getContainer: () => ({
    partnerRepo: {
      listPartners: (...args: unknown[]) => mockListPartners(...args),
      createPartner: (...args: unknown[]) => mockCreatePartner(...args),
    },
  }),
}));

function createGetRequest(): Request {
  return new Request("http://localhost:3000/api/partners");
}

function createPostRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/partners", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const mockPartner = {
  id: "p1",
  userId: "user_123",
  name: "Indie Hackers",
  platform: "twitter",
  url: "https://twitter.com/indiehackers",
  contactHandle: "@ih",
  status: "prospect",
  collaborationIdeas: "Cross-promo",
  notes: null,
  createdAt: new Date("2026-05-01T10:00:00Z"),
  updatedAt: new Date("2026-05-01T10:00:00Z"),
};

describe("GET /api/partners", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const response = await GET(createGetRequest());
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error.code).toBe("UNAUTHORIZED");
    expect(data.data).toBeNull();
  });

  it("returns partners for authenticated user", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockListPartners.mockResolvedValue([mockPartner]);

    const response = await GET(createGetRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toHaveLength(1);
    expect(data.data[0].id).toBe("p1");
    expect(data.error).toBeNull();
    expect(mockListPartners).toHaveBeenCalledWith("user_123");
  });
});

describe("POST /api/partners", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const response = await POST(
      createPostRequest({ name: "Indie Hackers", platform: "twitter" })
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error.code).toBe("UNAUTHORIZED");
  });

  it("creates a partner with valid body and returns 201", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockCreatePartner.mockResolvedValue(mockPartner);

    const response = await POST(
      createPostRequest({
        name: "Indie Hackers",
        platform: "twitter",
        url: "https://twitter.com/indiehackers",
        contactHandle: "@ih",
        collaborationIdeas: "Cross-promo",
      })
    );
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.data.id).toBe("p1");
    expect(data.error).toBeNull();
    expect(mockCreatePartner).toHaveBeenCalledWith(
      "user_123",
      expect.objectContaining({
        name: "Indie Hackers",
        platform: "twitter",
      })
    );
  });

  it("returns 400 when required fields are missing", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });

    const response = await POST(createPostRequest({ name: "Indie Hackers" }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error.code).toBe("VALIDATION_ERROR");
    expect(mockCreatePartner).not.toHaveBeenCalled();
  });

  it("returns 400 when status is invalid", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });

    const response = await POST(
      createPostRequest({
        name: "Indie Hackers",
        platform: "twitter",
        status: "not_a_real_status",
      })
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error.code).toBe("VALIDATION_ERROR");
  });
});
