import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import {
  useProspectList,
  useUpdateProspect,
  useCreateProspect,
  useBulkImportProspects,
  useDraftOutreach,
  type Prospect,
} from "../use-prospects";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function makeProspect(id: string, status: Prospect["status"]): Prospect {
  return {
    id,
    userId: "u1",
    handle: `user_${id}`,
    platform: "twitter",
    source: "manual",
    status,
    notes: null,
    tags: [],
    lastContactedAt: null,
    contactedCount: 0,
    convertedFromContentId: null,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  };
}

function createTestClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function withClient(client: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children);
  };
}

describe("useProspectList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches prospects with filter query params", async () => {
    const items = [makeProspect("p1", "cold")];
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: { items, total: 1, page: 1, limit: 50 },
          error: null,
        }),
    });

    const { result } = renderHook(
      () => useProspectList({ status: "cold", platform: "twitter", limit: 50 }),
      { wrapper: withClient(createTestClient()) }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.items).toEqual(items);
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/prospects?status=cold&platform=twitter&limit=50"
    );
  });

  it("surfaces HTTP errors", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({}),
    });

    const { result } = renderHook(() => useProspectList(), {
      wrapper: withClient(createTestClient()),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Failed to fetch prospects");
  });

  it("surfaces API error envelope", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: null,
          error: { message: "Unauthorized", code: "UNAUTHORIZED" },
        }),
    });

    const { result } = renderHook(() => useProspectList(), {
      wrapper: withClient(createTestClient()),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Unauthorized");
  });
});

describe("useUpdateProspect — optimistic update", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("optimistically updates the cached list before the request resolves", async () => {
    const client = createTestClient();
    const filterKey = { limit: 100 };
    client.setQueryData(["prospects", filterKey], {
      items: [makeProspect("p1", "cold")],
      total: 1,
      page: 1,
      limit: 100,
    });

    let resolveFetch!: (value: unknown) => void;
    mockFetch.mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      })
    );

    const { result } = renderHook(() => useUpdateProspect(), {
      wrapper: withClient(client),
    });

    act(() => {
      result.current.mutate({ id: "p1", patch: { status: "contacted" } });
    });

    await waitFor(() => {
      const cached = client.getQueryData<{ items: Prospect[] }>([
        "prospects",
        filterKey,
      ]);
      expect(cached?.items[0].status).toBe("contacted");
    });

    resolveFetch({
      ok: true,
      json: () =>
        Promise.resolve({
          data: { ...makeProspect("p1", "contacted") },
          error: null,
        }),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("rolls back the cached list when the server rejects the update", async () => {
    const client = createTestClient();
    const filterKey = { limit: 100 };
    client.setQueryData(["prospects", filterKey], {
      items: [makeProspect("p1", "cold")],
      total: 1,
      page: 1,
      limit: 100,
    });

    mockFetch.mockResolvedValue({
      ok: false,
      json: () =>
        Promise.resolve({
          error: { message: "Server error", code: "INTERNAL_ERROR" },
        }),
    });

    const { result } = renderHook(() => useUpdateProspect(), {
      wrapper: withClient(client),
    });

    act(() => {
      result.current.mutate({ id: "p1", patch: { status: "contacted" } });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    const cached = client.getQueryData<{ items: Prospect[] }>([
      "prospects",
      filterKey,
    ]);
    expect(cached?.items[0].status).toBe("cold");
    expect(result.current.error?.message).toBe("Server error");
  });
});

describe("useCreateProspect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("posts the create body and returns the created prospect", async () => {
    const created = makeProspect("p2", "cold");
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: created, error: null }),
    });

    const { result } = renderHook(() => useCreateProspect(), {
      wrapper: withClient(createTestClient()),
    });

    act(() => {
      result.current.mutate({ handle: "user_p2", platform: "twitter" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(created);
    expect(mockFetch).toHaveBeenCalledWith("/api/prospects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handle: "user_p2", platform: "twitter" }),
    });
  });
});

describe("useBulkImportProspects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends bulk import payload and parses response", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: { inserted: 2, skipped: 1, prospects: [] },
          error: null,
        }),
    });

    const { result } = renderHook(() => useBulkImportProspects(), {
      wrapper: withClient(createTestClient()),
    });

    act(() => {
      result.current.mutate({
        handles: ["@a", "@b", "@c"],
        platform: "twitter",
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({
      inserted: 2,
      skipped: 1,
      prospects: [],
    });
    expect(mockFetch).toHaveBeenCalledWith("/api/prospects/bulk-import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        handles: ["@a", "@b", "@c"],
        platform: "twitter",
      }),
    });
  });
});

describe("useDraftOutreach", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("posts to draft-outreach and returns variants", async () => {
    const draftResponse = {
      variants: [
        { message: "Hi!", approach: "direct", followUp: "Following up" },
        { message: "Saw your post", approach: "value_first", followUp: "..." },
      ],
      modelUsed: "claude-opus",
      tokensUsed: 100,
    };
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: draftResponse, error: null }),
    });

    const { result } = renderHook(() => useDraftOutreach(), {
      wrapper: withClient(createTestClient()),
    });

    act(() => {
      result.current.mutate({ id: "p1" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.variants).toHaveLength(2);
    expect(mockFetch).toHaveBeenCalledWith("/api/prospects/p1/draft-outreach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
  });
});
