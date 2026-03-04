import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../route";

// Mock Clerk auth
const mockAuth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
}));

// Mock database
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockOrderBy = vi.fn();
const mockLimit = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    select: () => {
      mockSelect();
      return {
        from: (...args: unknown[]) => {
          mockFrom(...args);
          return {
            where: (...args: unknown[]) => {
              mockWhere(...args);
              return {
                orderBy: (...args: unknown[]) => {
                  mockOrderBy(...args);
                  return {
                    limit: (n: number) => {
                      mockLimit(n);
                      return mockLimit._result;
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
  },
}));

vi.mock("@/lib/db/schema", () => ({
  audienceProfiles: {
    userId: "userId",
    isActive: "isActive",
    generatedAt: "generatedAt",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: unknown[]) => ({ type: "eq", args })),
  and: vi.fn((...args: unknown[]) => ({ type: "and", args })),
  desc: vi.fn((col: unknown) => ({ type: "desc", col })),
}));

describe("GET /api/audience-profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error.code).toBe("UNAUTHORIZED");
    expect(data.data).toBeNull();
  });

  it("returns profile when authenticated and profile exists", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });

    const mockProfile = {
      id: "profile_1",
      userId: "user_123",
      profileData: { primaryPersonas: [] },
      isActive: true,
    };

    (mockLimit as ReturnType<typeof vi.fn> & { _result: unknown[] })._result = [
      mockProfile,
    ];

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toEqual(mockProfile);
    expect(data.error).toBeNull();
  });

  it("returns null data when no profile exists", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });

    (mockLimit as ReturnType<typeof vi.fn> & { _result: unknown[] })._result =
      [];

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toBeNull();
    expect(data.error).toBeNull();
  });

  it("limits query to 1 result", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    (mockLimit as ReturnType<typeof vi.fn> & { _result: unknown[] })._result =
      [];

    await GET();

    expect(mockLimit).toHaveBeenCalledWith(1);
  });
});
