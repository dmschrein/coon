import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { CommunityHub } from "../community-hub";
import type { CommunityHubData } from "@/types";

function makeData(overrides: Partial<CommunityHubData> = {}): CommunityHubData {
  return {
    hasManifesto: false,
    completedSetupGuides: [],
    hasRules: false,
    hasActiveOnboarding: false,
    memberCount: 0,
    ...overrides,
  };
}

describe("CommunityHub", () => {
  it("shows 0% progress for a new user with no community config", () => {
    render(<CommunityHub data={makeData()} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "0"
    );
  });

  it("shows 100% progress when all 4 items are complete", () => {
    render(
      <CommunityHub
        data={makeData({
          hasManifesto: true,
          completedSetupGuides: ["discord"],
          hasRules: true,
          hasActiveOnboarding: true,
        })}
      />
    );
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "100"
    );
  });

  it("shows 50% progress when manifesto and a setup guide are complete only", () => {
    render(
      <CommunityHub
        data={makeData({
          hasManifesto: true,
          completedSetupGuides: ["discord"],
          hasRules: false,
          hasActiveOnboarding: false,
        })}
      />
    );
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "50"
    );
  });

  it("locks the rules section when the manifesto is not complete", () => {
    render(<CommunityHub data={makeData({ hasManifesto: false })} />);
    const rules = screen.getByTestId("hub-item-rules");
    expect(within(rules).getByTestId("hub-item-lock")).toBeInTheDocument();
  });

  it("shows 'Complete manifesto first' when the locked rules CTA is clicked", () => {
    render(<CommunityHub data={makeData({ hasManifesto: false })} />);
    const rules = screen.getByTestId("hub-item-rules");
    fireEvent.click(within(rules).getByRole("link", { name: /rules/i }));
    expect(screen.getByText(/complete manifesto first/i)).toBeInTheDocument();
  });

  it("links all 4 CTAs to their correct sub-pages", () => {
    render(<CommunityHub data={makeData()} />);
    expect(
      screen.getByRole("link", { name: /community manifesto/i })
    ).toHaveAttribute("href", "/dashboard/community/manifesto");
    expect(
      screen.getByRole("link", { name: /platform setup/i })
    ).toHaveAttribute("href", "/dashboard/community/setup");
    expect(
      screen.getByRole("link", { name: /community rules/i })
    ).toHaveAttribute("href", "/dashboard/community/rules");
    expect(
      screen.getByRole("link", { name: /member onboarding/i })
    ).toHaveAttribute("href", "/dashboard/community/onboarding");
  });

  it("displays the member count from the hub data", () => {
    render(<CommunityHub data={makeData({ memberCount: 42 })} />);
    expect(screen.getByTestId("hub-member-count")).toHaveTextContent("42");
  });
});
