import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DndContext } from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";
import React from "react";
import { ProspectCard } from "../prospect-card";
import type { Prospect } from "@/hooks/use-prospects";
import type { RecentContent } from "@/hooks/use-growth";

function makeProspect(overrides: Partial<Prospect> = {}): Prospect {
  return {
    id: "prospect-1",
    userId: "u1",
    handle: "alice",
    platform: "twitter",
    source: "manual",
    status: "cold",
    notes: null,
    tags: [],
    lastContactedAt: null,
    contactedCount: 0,
    convertedFromContentId: null,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    ...overrides,
  };
}

const sampleContent: RecentContent[] = [
  {
    id: "content-1",
    title: "Top piece",
    platform: "twitter",
    pillar: "education",
  },
  {
    id: "content-2",
    title: "Other piece",
    platform: "instagram",
    pillar: "behind-the-scenes",
  },
];

function renderCard(props: Partial<React.ComponentProps<typeof ProspectCard>>) {
  const defaults = {
    prospect: makeProspect(),
    onDraftMessage: vi.fn(),
  };
  const merged = { ...defaults, ...props };
  return render(
    <DndContext>
      <SortableContext items={[merged.prospect.id]}>
        <ProspectCard {...merged} />
      </SortableContext>
    </DndContext>
  );
}

describe("ProspectCard", () => {
  it("renders the dropdown when prospect has no attribution and recent content is provided", () => {
    renderCard({
      onMarkJoined: vi.fn(),
      recentContent: sampleContent,
    });

    expect(screen.getByText(/Mark as joined from/i)).toBeInTheDocument();
  });

  it("hides the dropdown when convertedFromContentId is already set", () => {
    renderCard({
      prospect: makeProspect({
        status: "joined",
        convertedFromContentId: "content-1",
      }),
      onMarkJoined: vi.fn(),
      recentContent: sampleContent,
    });

    expect(screen.queryByText(/Mark as joined from/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Joined from:/i)).toBeInTheDocument();
    expect(screen.getByText(/Top piece/i)).toBeInTheDocument();
  });

  it("hides the dropdown when status is 'declined'", () => {
    renderCard({
      prospect: makeProspect({ status: "declined" }),
      onMarkJoined: vi.fn(),
      recentContent: sampleContent,
    });

    expect(screen.queryByText(/Mark as joined from/i)).not.toBeInTheDocument();
  });

  it("hides the dropdown when no recent content is available", () => {
    renderCard({
      onMarkJoined: vi.fn(),
      recentContent: [],
    });

    expect(screen.queryByText(/Mark as joined from/i)).not.toBeInTheDocument();
  });

  it("hides the dropdown when no onMarkJoined handler is provided", () => {
    renderCard({
      recentContent: sampleContent,
    });

    expect(screen.queryByText(/Mark as joined from/i)).not.toBeInTheDocument();
  });

  it("renders the attribution badge with the resolved content title when already attributed", () => {
    renderCard({
      prospect: makeProspect({
        status: "joined",
        convertedFromContentId: "content-2",
      }),
      onMarkJoined: vi.fn(),
      recentContent: sampleContent,
    });

    expect(screen.getByText(/Joined from:/i)).toBeInTheDocument();
    expect(screen.getByText(/Other piece/i)).toBeInTheDocument();
  });

  it("falls back to 'previous content' when the attributed content is missing from recentContent", () => {
    renderCard({
      prospect: makeProspect({
        status: "joined",
        convertedFromContentId: "unknown-id",
      }),
      onMarkJoined: vi.fn(),
      recentContent: sampleContent,
    });

    expect(screen.getByText(/previous content/i)).toBeInTheDocument();
  });
});
