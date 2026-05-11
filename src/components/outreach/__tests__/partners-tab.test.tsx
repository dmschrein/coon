import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { PartnersTab } from "../partners-tab";
import type { Partner } from "@/lib/validations/partner";

const mockUsePartnersList = vi.fn();
const mockCreate = { mutate: vi.fn(), isPending: false };
const mockUpdate = { mutate: vi.fn(), isPending: false };
const mockDelete = { mutate: vi.fn(), isPending: false };

vi.mock("@/hooks/use-partners", () => ({
  usePartnersList: () => mockUsePartnersList(),
  useCreatePartner: () => mockCreate,
  useUpdatePartner: () => mockUpdate,
  useDeletePartner: () => mockDelete,
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function makePartner(overrides: Partial<Partner> & { id: string }): Partner {
  return {
    id: overrides.id,
    userId: "user_123",
    name: overrides.name ?? `Partner ${overrides.id}`,
    platform: overrides.platform ?? "twitter",
    url: overrides.url ?? null,
    contactHandle: overrides.contactHandle ?? null,
    status: overrides.status ?? "prospect",
    collaborationIdeas: overrides.collaborationIdeas ?? null,
    notes: overrides.notes ?? null,
    createdAt: overrides.createdAt ?? "2026-05-01T10:00:00Z",
    updatedAt: overrides.updatedAt ?? "2026-05-01T10:00:00Z",
  } as Partner;
}

function renderTab() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <PartnersTab />
    </QueryClientProvider>
  );
}

describe("PartnersTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate.mutate.mockReset();
    mockUpdate.mutate.mockReset();
    mockDelete.mutate.mockReset();
    mockUsePartnersList.mockReturnValue({
      data: [
        makePartner({
          id: "p1",
          name: "Indie Hackers",
          platform: "twitter",
          contactHandle: "@ih",
          status: "active",
          collaborationIdeas: "Cross-promo posts and event swaps",
        }),
        makePartner({
          id: "p2",
          name: "BuildSpace",
          platform: "discord",
          contactHandle: "build#1234",
          status: "prospect",
          collaborationIdeas: "Shared workshop calendar",
        }),
      ],
      isLoading: false,
      error: null,
    });
  });

  it("renders the table with the documented column headers", () => {
    renderTab();

    const table = screen.getByRole("table");
    const headers = within(table)
      .getAllByRole("columnheader")
      .map((th) => th.textContent?.trim());

    for (const label of [
      "Name",
      "Platform",
      "Contact",
      "Status",
      "Collaboration Ideas",
    ]) {
      expect(headers.some((h) => h?.includes(label))).toBe(true);
    }
  });

  it("toggles sort direction when the Name header is clicked", async () => {
    const user = userEvent.setup();
    renderTab();

    const table = screen.getByRole("table");
    const rowsBefore = within(table)
      .getAllByRole("row")
      .slice(1)
      .map((r) => r.textContent ?? "");
    expect(rowsBefore[0]).toContain("Indie Hackers");

    await user.click(screen.getByRole("button", { name: /name/i }));

    const rowsAfter = within(table)
      .getAllByRole("row")
      .slice(1)
      .map((r) => r.textContent ?? "");
    expect(rowsAfter[0]).toContain("BuildSpace");
  });

  it("toggles sort direction when the Status header is clicked", async () => {
    const user = userEvent.setup();
    renderTab();

    await user.click(screen.getByRole("button", { name: /status/i }));

    const table = screen.getByRole("table");
    const rows = within(table)
      .getAllByRole("row")
      .slice(1)
      .map((r) => r.textContent ?? "");
    expect(rows[0]).toMatch(/active/i);
  });

  it("opens a sheet with an editable form when a row is clicked", async () => {
    const user = userEvent.setup();
    renderTab();

    await user.click(screen.getByText("Indie Hackers"));

    expect(
      await screen.findByRole("dialog", { name: /edit partner/i })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/name/i)).toHaveValue("Indie Hackers");
    expect(screen.getByLabelText(/platform/i)).toBeInTheDocument();
  });

  it("calls the update mutation when the form is submitted", async () => {
    const user = userEvent.setup();
    renderTab();

    await user.click(screen.getByText("Indie Hackers"));
    const dialog = await screen.findByRole("dialog", {
      name: /edit partner/i,
    });

    const nameInput = within(dialog).getByLabelText(/name/i);
    await user.clear(nameInput);
    await user.type(nameInput, "Indie Hackers v2");

    await user.click(within(dialog).getByRole("button", { name: /save/i }));

    expect(mockUpdate.mutate).toHaveBeenCalledTimes(1);
    const [payload] = mockUpdate.mutate.mock.calls[0];
    expect(payload).toMatchObject({
      id: "p1",
      patch: expect.objectContaining({ name: "Indie Hackers v2" }),
    });
  });

  it("requires confirmation before calling the delete mutation", async () => {
    const user = userEvent.setup();
    renderTab();

    await user.click(screen.getByText("Indie Hackers"));
    const dialog = await screen.findByRole("dialog", {
      name: /edit partner/i,
    });

    await user.click(within(dialog).getByRole("button", { name: /delete/i }));
    expect(mockDelete.mutate).not.toHaveBeenCalled();

    const confirmDialog = await screen.findByRole("dialog", {
      name: /delete partner/i,
    });
    await user.click(
      within(confirmDialog).getByRole("button", { name: /confirm|delete/i })
    );

    expect(mockDelete.mutate).toHaveBeenCalledTimes(1);
    expect(mockDelete.mutate.mock.calls[0][0]).toBe("p1");
  });

  it("renders the empty state when there are no partners", () => {
    mockUsePartnersList.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });

    renderTab();

    expect(screen.getByText(/no partners yet/i)).toBeInTheDocument();
  });
});
