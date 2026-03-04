import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import {
  useAudienceProfile,
  useRegenerateProfile,
} from "../use-audience-profile";

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

describe("useAudienceProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches audience profile successfully", async () => {
    const profileData = {
      id: "profile_1",
      profileData: { primaryPersonas: [{ name: "Alex" }] },
      generatedAt: "2026-01-01T00:00:00Z",
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: profileData, error: null }),
    });

    const { result } = renderHook(() => useAudienceProfile(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(profileData);
    expect(mockFetch).toHaveBeenCalledWith("/api/audience-profile");
  });

  it("handles null profile (no profile generated yet)", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: null, error: null }),
    });

    const { result } = renderHook(() => useAudienceProfile(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBeNull();
  });

  it("handles API error", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: null,
          error: { message: "Internal error", code: "INTERNAL_ERROR" },
        }),
    });

    const { result } = renderHook(() => useAudienceProfile(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toBe("Internal error");
  });
});

describe("useRegenerateProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("regenerates profile successfully", async () => {
    const newProfile = {
      id: "profile_2",
      profileData: { primaryPersonas: [{ name: "New Persona" }] },
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: newProfile, error: null }),
    });

    const { result } = renderHook(() => useRegenerateProfile(), {
      wrapper: createWrapper(),
    });

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(newProfile);
    expect(mockFetch).toHaveBeenCalledWith("/api/audience-profile/regenerate", {
      method: "POST",
    });
  });

  it("handles regeneration failure", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: null,
          error: { message: "Agent failed", code: "AGENT_FAILED" },
        }),
    });

    const { result } = renderHook(() => useRegenerateProfile(), {
      wrapper: createWrapper(),
    });

    result.current.mutate();

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toBe("Agent failed");
  });
});
