import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { ProspectBoard } from "../prospect-board";
import type { Prospect } from "@/hooks/use-prospects";

function makeProspect(id: string, status: Prospect["status"]): Prospect {
  return {
    id,
    userId: "u1",
    handle: id,
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

function renderBoard(prospects: Prospect[]) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ProspectBoard
        prospects={prospects}
        onStatusChange={vi.fn()}
        onDraftMessage={vi.fn()}
      />
    </QueryClientProvider>
  );
}

describe("ProspectBoard", () => {
  it("renders all 5 column labels", () => {
    renderBoard([]);
    for (const label of [
      "Cold",
      "Contacted",
      "Responded",
      "Joined",
      "Declined",
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("places each prospect in its status column", () => {
    const cold = makeProspect("alice", "cold");
    const joined = makeProspect("bob", "joined");
    renderBoard([cold, joined]);

    expect(screen.getByText("@alice")).toBeInTheDocument();
    expect(screen.getByText("@bob")).toBeInTheDocument();
  });

  it("shows the empty-state text in columns that have no prospects", () => {
    renderBoard([makeProspect("alice", "cold")]);
    const emptyStates = screen.getAllByText("Drop prospects here");
    expect(emptyStates.length).toBe(4);
  });
});
