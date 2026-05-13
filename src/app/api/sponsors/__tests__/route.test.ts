import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "../route";

const mockAuth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
}));

const mockListSponsors = vi.fn();
const mockCreateSponsor = vi.fn();
vi.mock("@/lib/core/di/container", () => ({
  getContainer: () => ({
    sponsorRepo: {
      listSponsors: (...args: unknown[]) => mockListSponsors(...args),
      createSponsor: (...args: unknown[]) => mockCreateSponsor(...args),
    },
  }),
}));

function createGetRequest(query = ""): Request {
  return new Request(
    `http://localhost:3000/api/sponsors${query ? `?${query}` : ""}`
  );
}

function createPostRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/sponsors", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

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

describe("GET /api/sponsors", () => {
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

  it("returns sponsors for authenticated user", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockListSponsors.mockResolvedValue([mockSponsor]);

    const response = await GET(createGetRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toHaveLength(1);
    expect(data.error).toBeNull();
  });

  it("filters by status query parameter", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockListSponsors.mockResolvedValue([]);

    await GET(createGetRequest("status=active"));

    expect(mockListSponsors).toHaveBeenCalledWith(
      "user_123",
      expect.objectContaining({ status: "active" })
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

describe("POST /api/sponsors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const response = await POST(
      createPostRequest({ companyName: "Acme Corp" })
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error.code).toBe("UNAUTHORIZED");
  });

  it("creates sponsor with valid body", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockCreateSponsor.mockResolvedValue(mockSponsor);

    const response = await POST(
      createPostRequest({
        companyName: "Acme Corp",
        dealValue: 250000,
      })
    );
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.data.id).toBe("sponsor-1");
    expect(mockCreateSponsor).toHaveBeenCalledWith(
      "user_123",
      expect.objectContaining({ companyName: "Acme Corp", dealValue: 250000 })
    );
  });

  it("returns 400 on invalid body (missing companyName)", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });

    const response = await POST(createPostRequest({ dealValue: 100 }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error.code).toBe("VALIDATION_ERROR");
  });
});
