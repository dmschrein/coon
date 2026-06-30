import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { OnboardingStepRow } from "../onboarding-step-row";
import type { OnboardingStep } from "@/types";

const mockStep: OnboardingStep = {
  id: "step1",
  stepNumber: 1,
  triggerTiming: "immediate",
  channel: "email",
  subject: "Welcome to the guild",
  content: "Welcome aboard — here is your first quick win.",
};

describe("OnboardingStepRow", () => {
  it("loads the Tiptap editor with the step's pre-existing content", async () => {
    render(<OnboardingStepRow step={mockStep} onChange={vi.fn()} />);

    expect(
      await screen.findByText(/here is your first quick win/i)
    ).toBeInTheDocument();
  });

  it("shows the Immediate timing badge", () => {
    render(<OnboardingStepRow step={mockStep} onChange={vi.fn()} />);
    expect(screen.getByText("Immediate")).toBeInTheDocument();
  });

  it("renders a subject input for email-channel steps", () => {
    render(<OnboardingStepRow step={mockStep} onChange={vi.fn()} />);
    expect(
      screen.getByDisplayValue("Welcome to the guild")
    ).toBeInTheDocument();
  });

  it("hides the subject input for non-email channels", () => {
    render(
      <OnboardingStepRow
        step={{ ...mockStep, channel: "discord_dm", subject: null }}
        onChange={vi.fn()}
      />
    );
    expect(screen.queryByPlaceholderText(/subject/i)).not.toBeInTheDocument();
  });
});
