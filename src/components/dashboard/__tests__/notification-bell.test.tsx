import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { NotificationBell } from "../notification-bell";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

const sampleItem = {
  id: "n-1",
  userId: "user_123",
  type: "post_trending",
  title: "Your post is trending",
  body: "Foo is at 12% engagement.",
  link: "/dashboard/campaigns/c1/content/p1",
  read: false,
  createdAt: new Date(Date.now() - 10 * 60_000).toISOString(),
};

function mockGetResponse(items: unknown[], unreadCount: number) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve({ data: { items, unreadCount }, error: null }),
  });
}

describe("NotificationBell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the unread count badge from the API", async () => {
    mockGetResponse([sampleItem], 3);

    renderWithClient(<NotificationBell />);

    const badge = await screen.findByTestId("notification-badge");
    expect(badge).toHaveTextContent("3");
  });

  it("does not render the badge when unreadCount is 0", async () => {
    mockGetResponse([], 0);

    renderWithClient(<NotificationBell />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
    expect(screen.queryByTestId("notification-badge")).not.toBeInTheDocument();
  });

  it("clamps badge text to 9+ when unread > 9", async () => {
    mockGetResponse([sampleItem], 42);

    renderWithClient(<NotificationBell />);

    const badge = await screen.findByTestId("notification-badge");
    expect(badge).toHaveTextContent("9+");
  });

  it("calls PATCH /api/notifications/read-all when 'Mark all read' clicked", async () => {
    mockGetResponse([sampleItem], 1);
    // PATCH response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { success: true }, error: null }),
    });
    // Refetch after invalidation
    mockGetResponse([{ ...sampleItem, read: true }], 0);

    const user = userEvent.setup();
    renderWithClient(<NotificationBell />);

    await screen.findByTestId("notification-badge");

    await user.click(screen.getByLabelText("Notifications"));

    const markBtn = await screen.findByRole("button", {
      name: /mark all read/i,
    });
    await user.click(markBtn);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/notifications/read-all",
        expect.objectContaining({ method: "PATCH" })
      );
    });
  });
});
