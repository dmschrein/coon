import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PATCH, DELETE } from "../route";

const mockAuth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
}));

const mockGetMember = vi.fn();
const mockUpdateMember = vi.fn();
const mockDeleteMember = vi.fn();
vi.mock("@/lib/core/di/container", () => ({
  getContainer: () => ({
    platformMemberRepo: {
      getMember: (...args: unknown[]) => mockGetMember(...args),
      updateMember: (...args: unknown[]) => mockUpdateMember(...args),
      deleteMember: (...args: unknown[]) => mockDeleteMember(...args),
    },
  }),
}));

const mockMember = {
  id: "member-1",
  userId: "user_123",
  platform: "instagram",
  platformUserId: "ig_user_1",
  username: "alice",
  displayName: "Alice",
  firstSeenAt: new Date("2026-04-28T10:00:00Z"),
  engagementCount: 1,
  lastSeenAt: new Date("2026-04-28T10:00:00Z"),
  status: "prospect",
  tags: [],
  notes: null,
};

function paramsFor(id: string) {
  return { params: Promise.resolve({ id }) };
}

function patchRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/members/member-1", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("GET /api/members/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const response = await GET(
      new Request("http://localhost"),
      paramsFor("member-1")
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error.code).toBe("UNAUTHORIZED");
  });

  it("returns member by id for owner", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockGetMember.mockResolvedValue(mockMember);

    const response = await GET(
      new Request("http://localhost"),
      paramsFor("member-1")
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.id).toBe("member-1");
    expect(mockGetMember).toHaveBeenCalledWith("member-1");
  });

  it("returns 404 when member belongs to another user", async () => {
    mockAuth.mockResolvedValue({ userId: "user_999" });
    mockGetMember.mockResolvedValue(mockMember);

    const response = await GET(
      new Request("http://localhost"),
      paramsFor("member-1")
    );
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error.code).toBe("NOT_FOUND");
  });

  it("returns 404 when member does not exist", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockGetMember.mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost"),
      paramsFor("missing")
    );
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error.code).toBe("NOT_FOUND");
  });
});

describe("PATCH /api/members/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const response = await PATCH(
      patchRequest({ tags: ["vip"] }),
      paramsFor("member-1")
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error.code).toBe("UNAUTHORIZED");
  });

  it("updates tags array", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockGetMember.mockResolvedValue(mockMember);
    mockUpdateMember.mockResolvedValue({ ...mockMember, tags: ["vip"] });

    const response = await PATCH(
      patchRequest({ tags: ["vip"] }),
      paramsFor("member-1")
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.tags).toEqual(["vip"]);
    expect(mockUpdateMember).toHaveBeenCalledWith("member-1", {
      tags: ["vip"],
    });
  });

  it("returns 404 when member does not exist", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockGetMember.mockResolvedValue(null);

    const response = await PATCH(
      patchRequest({ status: "advocate" }),
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
      paramsFor("member-1")
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error.code).toBe("VALIDATION_ERROR");
  });

  it("clears notes when notes is explicitly null", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockGetMember.mockResolvedValue({ ...mockMember, notes: "old note" });
    mockUpdateMember.mockResolvedValue({ ...mockMember, notes: null });

    const response = await PATCH(
      patchRequest({ notes: null }),
      paramsFor("member-1")
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.notes).toBeNull();
    expect(mockUpdateMember).toHaveBeenCalledWith("member-1", { notes: null });
  });
});

describe("DELETE /api/members/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const response = await DELETE(
      new Request("http://localhost"),
      paramsFor("member-1")
    );
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error.code).toBe("UNAUTHORIZED");
  });

  it("deletes member for owner", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockGetMember.mockResolvedValue(mockMember);
    mockDeleteMember.mockResolvedValue(undefined);

    const response = await DELETE(
      new Request("http://localhost"),
      paramsFor("member-1")
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.id).toBe("member-1");
    expect(mockDeleteMember).toHaveBeenCalledWith("member-1");
  });

  it("returns 404 when member not found", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockGetMember.mockResolvedValue(null);

    const response = await DELETE(
      new Request("http://localhost"),
      paramsFor("missing")
    );
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error.code).toBe("NOT_FOUND");
    expect(mockDeleteMember).not.toHaveBeenCalled();
  });
});
