import { describe, it, expect, vi } from "vitest";
import { computeStatusChange } from "../sponsorships-board";
import type { Sponsor } from "@/lib/validations/sponsor";

// We test the pure drag-resolution helper directly. The Kanban component itself
// passes this result to the useUpdateSponsor mutation, which is verified at the
// hook + route layer.

function makeSponsor(overrides: Partial<Sponsor>): Sponsor {
  return {
    id: "s1",
    userId: "user_123",
    companyName: "Acme",
    contactName: null,
    contactEmail: null,
    dealValue: 100000,
    status: "outreach",
    deliverables: null,
    startDate: null,
    endDate: null,
    notes: null,
    createdAt: "2026-05-01T10:00:00Z",
    updatedAt: "2026-05-01T10:00:00Z",
    ...overrides,
  };
}

describe("computeStatusChange (drag-to-status helper)", () => {
  it("returns id + newStatus when dragged to a different valid column", () => {
    const sponsors = [makeSponsor({ id: "s1", status: "outreach" })];
    const change = computeStatusChange("s1", "active", sponsors);
    expect(change).toEqual({ id: "s1", newStatus: "active" });
  });

  it("returns null when dropped onto the same column it came from", () => {
    const sponsors = [makeSponsor({ id: "s1", status: "active" })];
    const change = computeStatusChange("s1", "active", sponsors);
    expect(change).toBeNull();
  });

  it("returns null when dropped onto an unknown column id", () => {
    const sponsors = [makeSponsor({ id: "s1", status: "outreach" })];
    const change = computeStatusChange("s1", "not-a-real-column", sponsors);
    expect(change).toBeNull();
  });

  it("returns null when the dragged sponsor is not in the list", () => {
    const sponsors = [makeSponsor({ id: "s1" })];
    const change = computeStatusChange("missing", "active", sponsors);
    expect(change).toBeNull();
  });
});

describe("Kanban drag flow → PATCH wiring", () => {
  it("simulates the drop callback flow that calls update with new status", () => {
    // This mirrors what happens inside sponsorships-board.tsx: when DnD fires
    // onDragEnd, the board computes the status change and calls
    // updateSponsor.mutate({ id, patch: { status: newStatus } }).
    const updateMutate = vi.fn();
    const sponsors = [makeSponsor({ id: "s1", status: "outreach" })];

    const change = computeStatusChange("s1", "active", sponsors);
    if (change) {
      updateMutate({ id: change.id, patch: { status: change.newStatus } });
    }

    expect(updateMutate).toHaveBeenCalledWith({
      id: "s1",
      patch: { status: "active" },
    });
  });
});
