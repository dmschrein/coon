import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useCampaignList, useCreateCampaign } from "../use-campaign";

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children
    );
  };
}

describe("useCampaignList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches campaigns successfully", async () => {
    const campaigns = [
      { id: "1", name: "Campaign 1" },
      { id: "2", name: "Campaign 2" },
    ];

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: campaigns, error: null }),
    });

    const { result } = renderHook(() => useCampaignList(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(campaigns);
    expect(mockFetch).toHaveBeenCalledWith("/api/campaign");
  });

  it("handles fetch failure", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({}),
    });

    const { result } = renderHook(() => useCampaignList(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toBe("Failed to fetch campaigns");
  });

  it("handles API error response", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: null,
          error: { message: "Unauthorized", code: "UNAUTHORIZED" },
        }),
    });

    const { result } = renderHook(() => useCampaignList(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toBe("Unauthorized");
  });
});

describe("useCreateCampaign", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates campaign with selected platforms", async () => {
    const newCampaign = { id: "camp_1", name: "New Campaign" };

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: newCampaign, error: null }),
    });

    const { result } = renderHook(() => useCreateCampaign(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(["twitter", "linkedin"]);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(newCampaign);
    expect(mockFetch).toHaveBeenCalledWith("/api/campaign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selectedPlatforms: ["twitter", "linkedin"] }),
    });
  });

  it("handles creation failure", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({}),
    });

    const { result } = renderHook(() => useCreateCampaign(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(["twitter"]);

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toBe("Failed to create campaign");
  });
});
