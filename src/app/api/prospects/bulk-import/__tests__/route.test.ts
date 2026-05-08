import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../route";

const mockAuth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
}));

const mockBulkCreate = vi.fn();
vi.mock("@/lib/core/di/container", () => ({
  getContainer: () => ({
    prospectRepo: {
      bulkCreateProspects: (...args: unknown[]) => mockBulkCreate(...args),
    },
  }),
}));

function postBulk(body: unknown): Request {
  return new Request("http://localhost:3000/api/prospects/bulk-import", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function fakeProspect(handle: string, platform: string) {
  return {
    id: `prospect-${handle}`,
    userId: "user_123",
    handle,
    platform,
    source: "import",
    status: "cold",
    notes: null,
    tags: [],
    lastContactedAt: null,
    contactedCount: 0,
    convertedFromContentId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("POST /api/prospects/bulk-import", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const response = await POST(postBulk({ handles: ["alice"] }));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error.code).toBe("UNAUTHORIZED");
  });

  it("auto-detects reddit/twitter/manual platforms", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockBulkCreate.mockResolvedValue({
      inserted: [
        fakeProspect("u/alice", "reddit"),
        fakeProspect("bob", "twitter"),
        fakeProspect("charlie", "manual"),
      ],
      skipped: 0,
    });

    const response = await POST(
      postBulk({ handles: ["u/alice", "@bob", "charlie"] })
    );
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.data.inserted).toBe(3);
    expect(data.data.skipped).toBe(0);
    expect(data.data.prospects).toHaveLength(3);

    const arg = mockBulkCreate.mock.calls[0][0];
    expect(arg).toEqual([
      {
        userId: "user_123",
        handle: "u/alice",
        platform: "reddit",
        source: "import",
      },
      {
        userId: "user_123",
        handle: "bob",
        platform: "twitter",
        source: "import",
      },
      {
        userId: "user_123",
        handle: "charlie",
        platform: "manual",
        source: "import",
      },
    ]);
  });

  it("uses provided platform when specified", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockBulkCreate.mockResolvedValue({
      inserted: [
        fakeProspect("alice", "instagram"),
        fakeProspect("bob", "instagram"),
      ],
      skipped: 0,
    });

    await POST(postBulk({ handles: ["alice", "bob"], platform: "instagram" }));

    const arg = mockBulkCreate.mock.calls[0][0];
    expect(arg).toEqual([
      {
        userId: "user_123",
        handle: "alice",
        platform: "instagram",
        source: "import",
      },
      {
        userId: "user_123",
        handle: "bob",
        platform: "instagram",
        source: "import",
      },
    ]);
  });

  it("dedupes within batch and counts in skipped", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockBulkCreate.mockResolvedValue({
      inserted: [fakeProspect("alice", "twitter")],
      skipped: 0,
    });

    const response = await POST(postBulk({ handles: ["@alice", "@alice"] }));
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.data.inserted).toBe(1);
    expect(data.data.skipped).toBe(1); // 1 duplicate dropped in batch
    expect(mockBulkCreate.mock.calls[0][0]).toHaveLength(1);
  });

  it("counts DB-level dedupe in skipped", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockBulkCreate.mockResolvedValue({
      inserted: [fakeProspect("alice", "twitter")],
      skipped: 2, // bob and charlie already existed
    });

    const response = await POST(
      postBulk({ handles: ["@alice", "@bob", "charlie"] })
    );
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.data.inserted).toBe(1);
    expect(data.data.skipped).toBe(2);
  });

  it("returns 400 on empty handles array", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });

    const response = await POST(postBulk({ handles: [] }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 on missing handles field", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });

    const response = await POST(postBulk({}));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error.code).toBe("VALIDATION_ERROR");
  });
});
