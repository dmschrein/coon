import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { GrowthTab } from "../growth-tab";
import type { GrowthSummary } from "@/lib/validations/growth";

const mockUseGrowthSummary = vi.fn();
vi.mock("@/hooks/use-growth-summary", () => ({
  useGrowthSummary: () => mockUseGrowthSummary(),
}));

beforeAll(() => {
  if (typeof globalThis.ResizeObserver === "undefined") {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  }
});

function makeSummary(overrides: Partial<GrowthSummary> = {}): GrowthSummary {
  return {
    memberCountByWeek: Array.from({ length: 8 }, (_, i) => ({
      week: `2026-W${String(i + 10).padStart(2, "0")}`,
      count: i + 1,
    })),
    newMembersThisWeek: 7,
    newMembersLastWeek: 4,
    topConvertingContent: [
      { title: "Launch post", joins: 5 },
      { title: "How we built it", joins: 3 },
    ],
    topConvertingPlatform: "twitter",
    prospectsInPipeline: 20,
    prospectConversionRate: 34.5,
    prospectsByStatus: {
      cold: 10,
      contacted: 5,
      responded: 3,
      joined: 2,
    },
    ...overrides,
  };
}

describe("GrowthTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a LineChart container when data is loaded", () => {
    mockUseGrowthSummary.mockReturnValue({
      data: makeSummary(),
      isLoading: false,
      isError: false,
      error: null,
    });

    const { container } = render(<GrowthTab />);

    // Recharts renders an SVG container with .recharts-wrapper class
    expect(
      container.querySelector(".recharts-responsive-container")
    ).toBeTruthy();
  });

  it("renders 'New Members This Week' stat card with its value", () => {
    mockUseGrowthSummary.mockReturnValue({
      data: makeSummary({ newMembersThisWeek: 7 }),
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<GrowthTab />);

    expect(screen.getByText(/new members this week/i)).toBeInTheDocument();
    expect(screen.getByTestId("stat-this-week")).toHaveTextContent("7");
  });

  it("renders 'New Members Last Week' stat card with its value", () => {
    mockUseGrowthSummary.mockReturnValue({
      data: makeSummary({ newMembersLastWeek: 4 }),
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<GrowthTab />);

    expect(screen.getByText(/new members last week/i)).toBeInTheDocument();
    expect(screen.getByTestId("stat-last-week")).toHaveTextContent("4");
  });

  it("shows a green up-arrow when thisWeek > lastWeek", () => {
    mockUseGrowthSummary.mockReturnValue({
      data: makeSummary({ newMembersThisWeek: 7, newMembersLastWeek: 4 }),
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<GrowthTab />);

    const indicator = screen.getByTestId("delta-indicator");
    expect(indicator).toHaveAttribute("data-direction", "up");
    expect(indicator).toHaveTextContent(/\+3/);
  });

  it("shows a red down-arrow when thisWeek < lastWeek", () => {
    mockUseGrowthSummary.mockReturnValue({
      data: makeSummary({ newMembersThisWeek: 1, newMembersLastWeek: 5 }),
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<GrowthTab />);

    const indicator = screen.getByTestId("delta-indicator");
    expect(indicator).toHaveAttribute("data-direction", "down");
    expect(indicator).toHaveTextContent(/-4/);
  });

  it("shows a neutral indicator when thisWeek equals lastWeek", () => {
    mockUseGrowthSummary.mockReturnValue({
      data: makeSummary({ newMembersThisWeek: 3, newMembersLastWeek: 3 }),
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<GrowthTab />);

    const indicator = screen.getByTestId("delta-indicator");
    expect(indicator).toHaveAttribute("data-direction", "neutral");
    expect(indicator).toHaveTextContent(/no change/i);
  });

  it("renders top converting content with titles and join counts", () => {
    mockUseGrowthSummary.mockReturnValue({
      data: makeSummary({
        topConvertingContent: [
          { title: "Launch post", joins: 5 },
          { title: "How we built it", joins: 3 },
        ],
      }),
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<GrowthTab />);

    expect(screen.getByText("Launch post")).toBeInTheDocument();
    expect(screen.getByText("How we built it")).toBeInTheDocument();
    expect(screen.getByText(/5 joins/i)).toBeInTheDocument();
    expect(screen.getByText(/3 joins/i)).toBeInTheDocument();
  });

  it("renders the 4-stage prospect conversion funnel", () => {
    mockUseGrowthSummary.mockReturnValue({
      data: makeSummary(),
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<GrowthTab />);

    expect(screen.getByText(/^cold$/i)).toBeInTheDocument();
    expect(screen.getByText(/^contacted$/i)).toBeInTheDocument();
    expect(screen.getByText(/^responded$/i)).toBeInTheDocument();
    expect(screen.getByText(/^joined$/i)).toBeInTheDocument();
  });

  it("renders the conversion rate as a percentage string", () => {
    mockUseGrowthSummary.mockReturnValue({
      data: makeSummary({ prospectConversionRate: 34.5 }),
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<GrowthTab />);

    expect(screen.getByText(/34\.5%/)).toBeInTheDocument();
  });

  it("shows a loading skeleton when isLoading is true", () => {
    mockUseGrowthSummary.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    });

    const { container } = render(<GrowthTab />);
    expect(container.querySelector(".animate-pulse")).toBeTruthy();
  });

  it("shows an error message when fetch fails", () => {
    mockUseGrowthSummary.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("boom"),
    });

    render(<GrowthTab />);
    expect(screen.getByText(/could not load growth data/i)).toBeInTheDocument();
  });
});
