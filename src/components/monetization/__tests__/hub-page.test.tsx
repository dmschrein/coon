import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HubPage } from "../hub-page";
import type {
  MonetizationConfig,
  ReadinessOutput,
  ModelReadiness,
} from "@/types";

vi.mock("@/hooks/use-monetization-readiness", () => ({
  useMonetizationReadiness: () => ({ data: null, isLoading: false }),
}));

function renderHub(data: {
  config: MonetizationConfig | null;
  readiness: ReadinessOutput | null;
  revenueThisMonth: number;
  pipelineValue: number;
  activeTierCount: number;
}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <HubPage data={data} />
    </QueryClientProvider>
  );
}

const config: MonetizationConfig = {
  selectedModels: ["paid_membership", "sponsorships"],
  completedAt: "2026-05-01T12:00:00.000Z",
};

const readiness: ReadinessOutput = {
  models: [
    {
      name: "paid_membership",
      score: 82,
      benchmark: "500+ members",
      topActions: ["Survey members", "Launch tier", "Iterate pricing"],
      readyToLaunch: true,
    } satisfies ModelReadiness,
    {
      name: "sponsorships",
      score: 45,
      benchmark: "5k reach + clear niche",
      topActions: [
        "Define your audience tightly",
        "Compile a media kit",
        "Hit 5k reach per post",
      ],
      readyToLaunch: false,
    } satisfies ModelReadiness,
  ],
  overallScore: 64,
  summary: "Membership ready, sponsorships need work.",
};

describe("HubPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a CTA card linking to setup when config is null", () => {
    renderHub({
      config: null,
      readiness: null,
      revenueThisMonth: 0,
      pipelineValue: 0,
      activeTierCount: 0,
    });

    const cta = screen.getByRole("link", {
      name: /set up your monetization model/i,
    });
    expect(cta).toBeInTheDocument();
    expect(cta).toHaveAttribute("href", "/dashboard/monetization/setup");
  });

  it("renders exactly 4 stat cards when config is present", () => {
    renderHub({
      config,
      readiness,
      revenueThisMonth: 100000,
      pipelineValue: 250000,
      activeTierCount: 3,
    });

    const statGrid = screen.getByTestId("monetization-stat-grid");
    const cards = within(statGrid).getAllByTestId("monetization-stat-card");
    expect(cards).toHaveLength(4);
  });

  it("shows the readiness scorecard section when readiness data is present", () => {
    renderHub({
      config,
      readiness,
      revenueThisMonth: 0,
      pipelineValue: 0,
      activeTierCount: 0,
    });

    expect(
      screen.getByRole("heading", { name: /launch readiness/i })
    ).toBeInTheDocument();
  });

  it("renders a Next Best Action card showing the top action from the lowest-scoring model", () => {
    renderHub({
      config,
      readiness,
      revenueThisMonth: 0,
      pipelineValue: 0,
      activeTierCount: 0,
    });

    const card = screen.getByTestId("next-best-action-card");
    expect(card).toBeInTheDocument();
    // Sponsorships has the lowest score (45), so its first topAction should appear
    expect(
      within(card).getByText(/define your audience tightly/i)
    ).toBeInTheDocument();
  });

  it("stat card values match the data returned by the API", () => {
    renderHub({
      config,
      readiness,
      revenueThisMonth: 125000,
      pipelineValue: 450000,
      activeTierCount: 3,
    });

    const statGrid = screen.getByTestId("monetization-stat-grid");
    expect(within(statGrid).getByText(/\$1,250/)).toBeInTheDocument();
    expect(within(statGrid).getByText(/\$4,500/)).toBeInTheDocument();
    expect(within(statGrid).getByText("3")).toBeInTheDocument();
    expect(within(statGrid).getByText("64")).toBeInTheDocument();
  });
});
