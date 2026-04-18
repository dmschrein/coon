import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrategyCard } from "../strategy-card";
import { audienceProfileFixture } from "@/lib/agents/__fixtures__/audience";
import type { ConfidenceLevel } from "@/types";

const defaultProps = {
  profile: audienceProfileFixture,
  confidenceLevel: "quiz_based" as ConfidenceLevel,
  onRegenerate: vi.fn(),
  isRegenerating: false,
};

describe("StrategyCard", () => {
  it("renders the primary persona name and description", () => {
    render(<StrategyCard {...defaultProps} />);

    expect(screen.getByText("Alex the Solo Founder")).toBeInTheDocument();
    expect(screen.getByText(/technical solo founder/i)).toBeInTheDocument();
  });

  it("renders demographic tags", () => {
    render(<StrategyCard {...defaultProps} />);

    expect(screen.getByText("25-45")).toBeInTheDocument();
    expect(screen.getByText("United States")).toBeInTheDocument();
    expect(screen.getByText("Founder")).toBeInTheDocument();
  });

  it("renders brand voice descriptors", () => {
    render(<StrategyCard {...defaultProps} />);

    expect(screen.getByText("Bold")).toBeInTheDocument();
    expect(screen.getByText("Empathetic")).toBeInTheDocument();
    expect(screen.getByText("No-BS")).toBeInTheDocument();
    expect(screen.getByText("Builder-first")).toBeInTheDocument();
  });

  it("renders brand voice summary", () => {
    render(<StrategyCard {...defaultProps} />);

    expect(
      screen.getByText(/direct, empowering, zero fluff/i)
    ).toBeInTheDocument();
  });

  it("renders content pillars with percentages", () => {
    render(<StrategyCard {...defaultProps} />);

    expect(screen.getByText("Build in Public")).toBeInTheDocument();
    expect(screen.getByText("35%")).toBeInTheDocument();
    expect(screen.getByText("Audience Growth")).toBeInTheDocument();
    expect(screen.getByText("30%")).toBeInTheDocument();
    expect(screen.getByText("Product Marketing")).toBeInTheDocument();
    expect(screen.getByText("20%")).toBeInTheDocument();
    expect(screen.getByText("Founder Mindset")).toBeInTheDocument();
    expect(screen.getByText("15%")).toBeInTheDocument();
  });

  it("renders the confidence badge", () => {
    render(<StrategyCard {...defaultProps} />);

    expect(screen.getByText("Quiz-based")).toBeInTheDocument();
  });

  it("calls onRegenerate when regenerate button is clicked", async () => {
    const onRegenerate = vi.fn();
    render(<StrategyCard {...defaultProps} onRegenerate={onRegenerate} />);

    await userEvent.click(screen.getByRole("button", { name: /regenerate/i }));

    expect(onRegenerate).toHaveBeenCalledOnce();
  });

  it("shows loading state when isRegenerating is true", () => {
    render(<StrategyCard {...defaultProps} isRegenerating />);

    expect(screen.getByText("Regenerating...")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /regenerating/i })
    ).toBeDisabled();
  });

  it("shows fallback text when brandVoice is missing", () => {
    const profileWithout = { ...audienceProfileFixture, brandVoice: undefined };
    render(<StrategyCard {...defaultProps} profile={profileWithout} />);

    expect(
      screen.getByText(/regenerate your profile to get brand voice/i)
    ).toBeInTheDocument();
  });

  it("shows fallback text when contentPillars is missing", () => {
    const profileWithout = {
      ...audienceProfileFixture,
      contentPillars: undefined,
    };
    render(<StrategyCard {...defaultProps} profile={profileWithout} />);

    expect(
      screen.getByText(/regenerate your profile to get content pillar/i)
    ).toBeInTheDocument();
  });
});
