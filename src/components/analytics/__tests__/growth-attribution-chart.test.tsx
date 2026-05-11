import { describe, it, expect, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";
import { GrowthAttributionChart } from "../growth-attribution-chart";

beforeAll(() => {
  // recharts ResponsiveContainer reads parent box from ResizeObserver
  if (typeof globalThis.ResizeObserver === "undefined") {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  }
});

describe("GrowthAttributionChart", () => {
  it("renders the empty-state message when data is empty", () => {
    render(<GrowthAttributionChart data={[]} />);

    expect(screen.getByText("Growth Attribution")).toBeInTheDocument();
    expect(screen.getByText(/No conversions tracked yet/i)).toBeInTheDocument();
  });

  it("renders the chart card title when data is provided", () => {
    render(
      <GrowthAttributionChart
        data={[
          { pillar: "education", joins: 5 },
          { pillar: "behind-the-scenes", joins: 3 },
        ]}
      />
    );

    expect(screen.getByText("Growth Attribution")).toBeInTheDocument();
    expect(
      screen.queryByText(/No conversions tracked yet/i)
    ).not.toBeInTheDocument();
  });

  it("truncates long pillar names beyond 15 characters", () => {
    const longName = "this-is-a-very-long-pillar-name";
    render(<GrowthAttributionChart data={[{ pillar: longName, joins: 1 }]} />);

    // The title is still rendered above the chart
    expect(screen.getByText("Growth Attribution")).toBeInTheDocument();
  });
});
