import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useGrowthSummary } from "../use-growth-summary";
import type { GrowthSummary } from "@/lib/validations/growth";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

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

function makeSummary(): GrowthSummary {
  return {
    memberCountByWeek: Array.from({ length: 8 }, (_, i) => ({
      week: `2026-W${String(i + 10).padStart(2, "0")}`,
      count: i,
    })),
    newMembersThisWeek: 4,
    newMembersLastWeek: 2,
    topConvertingContent: [{ title: "Launch", joins: 3 }],
    topConvertingPlatform: "twitter",
    prospectsInPipeline: 10,
    prospectConversionRate: 30,
    prospectsByStatus: {
      cold: 5,
      contacted: 2,
      responded: 1,
      joined: 2,
    },
  };
}

describe("useGrowthSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns { data: undefined, isLoading: true } on initial render", () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useGrowthSummary(), {
      wrapper: withClient(createTestClient()),
    });

    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(true);
  });

  it("returns the GrowthSummary after a successful fetch", async () => {
    const summary = makeSummary();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: summary, error: null }),
    });

    const { result } = renderHook(() => useGrowthSummary(), {
      wrapper: withClient(createTestClient()),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(summary);
    expect(mockFetch).toHaveBeenCalledWith("/api/growth/summary");
  });

  it("returns an error when fetch fails (HTTP error)", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({}),
    });

    const { result } = renderHook(() => useGrowthSummary(), {
      wrapper: withClient(createTestClient()),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeDefined();
  });

  it("returns an error when API returns an error envelope", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: null,
          error: { message: "Unauthorized", code: "UNAUTHORIZED" },
        }),
    });

    const { result } = renderHook(() => useGrowthSummary(), {
      wrapper: withClient(createTestClient()),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Unauthorized");
  });

  it("uses the query key ['growth', 'summary']", async () => {
    const summary = makeSummary();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: summary, error: null }),
    });

    const client = createTestClient();
    const { result } = renderHook(() => useGrowthSummary(), {
      wrapper: withClient(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(client.getQueryData(["growth", "summary"])).toEqual(summary);
  });

  it("does not refetch on window focus (staleTime is set)", async () => {
    const summary = makeSummary();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: summary, error: null }),
    });

    const client = createTestClient();
    const { result } = renderHook(() => useGrowthSummary(), {
      wrapper: withClient(client),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Simulate window focus — should NOT refetch because of staleTime
    window.dispatchEvent(new Event("focus"));
    await new Promise((r) => setTimeout(r, 50));
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
