import { describe, it, expect, beforeAll, vi } from "vitest";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RevenueCharts } from "../revenue-charts";

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

// Hooks used by parent dashboards depend on fetch + auth; the chart subcomponent
// is pure and prop-driven, so we render it directly to verify it doesn't throw
// on empty input.
vi.mock("@/hooks/use-revenue", () => ({
  useRevenueList: () => ({ data: [], isLoading: false }),
  useMRRSummary: () => ({ data: null, isLoading: false }),
  useCreateRevenueEntry: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateRevenueEntry: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteRevenueEntry: () => ({ mutate: vi.fn(), isPending: false }),
}));

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>
  );
}

describe("RevenueCharts", () => {
  it("renders ComposedChart without throwing when entries is an empty array", () => {
    expect(() =>
      renderWithClient(<RevenueCharts entries={[]} />)
    ).not.toThrow();
  });

  it("renders PieChart without throwing when entries is an empty array", () => {
    expect(() =>
      renderWithClient(<RevenueCharts entries={[]} />)
    ).not.toThrow();
  });
});
