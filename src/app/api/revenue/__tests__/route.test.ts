import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "../route";

const mockAuth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
}));

const mockListEntries = vi.fn();
const mockCreateEntry = vi.fn();
vi.mock("@/lib/core/di/container", () => ({
  getContainer: () => ({
    revenueRepo: {
      listEntries: (...args: unknown[]) => mockListEntries(...args),
      createEntry: (...args: unknown[]) => mockCreateEntry(...args),
    },
  }),
}));

function createGetRequest(query = ""): Request {
  return new Request(
    `http://localhost:3000/api/revenue${query ? `?${query}` : ""}`
  );
}

function createPostRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/revenue", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("GET /api/revenue", () => {
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
});

describe("POST /api/revenue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const response = await POST(
      createPostRequest({
        date: "2026-05-15",
        type: "membership",
        amountCents: 1000,
      })
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error.code).toBe("UNAUTHORIZED");
  });
});
