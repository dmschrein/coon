import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { ModelWizard } from "../model-wizard";
import { MonetizationSetup } from "../monetization-setup";
import { MONETIZATION_MODEL_CARDS } from "@/lib/constants/monetization-models";
import type { MonetizationConfig } from "@/types";

const mockUseConfig = vi.fn();
const mockSave = { mutateAsync: vi.fn(), isPending: false };

vi.mock("@/hooks/use-monetization-config", () => ({
  useMonetizationConfig: () => mockUseConfig(),
  useSaveMonetizationConfig: () => mockSave,
}));

function renderWizard(props?: {
  defaultSelected?: MonetizationConfig["selectedModels"];
}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const onOpenChange = vi.fn();
  const result = render(
    <QueryClientProvider client={client}>
      <ModelWizard
        open={true}
        onOpenChange={onOpenChange}
        defaultSelected={props?.defaultSelected}
      />
    </QueryClientProvider>
  );
  return { ...result, onOpenChange };
}

function renderSetup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MonetizationSetup />
    </QueryClientProvider>
  );
}

describe("ModelWizard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSave.mutateAsync.mockReset();
    mockSave.mutateAsync.mockResolvedValue(undefined);
  });

  it("renders step 1 (headline) by default", () => {
    renderWizard();

    expect(
      screen.getByRole("heading", { name: /pick how you'll monetize/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^next$/i })).toBeInTheDocument();
  });

  it("advances to step 2 (model card selection) when Next is clicked on step 1", async () => {
    const user = userEvent.setup();
    renderWizard();

    await user.click(screen.getByRole("button", { name: /^next$/i }));

    expect(
      screen.getByRole("heading", { name: /choose your models/i })
    ).toBeInTheDocument();
  });

  it("displays all 6 model cards on step 2", async () => {
    const user = userEvent.setup();
    renderWizard();
    await user.click(screen.getByRole("button", { name: /^next$/i }));

    for (const card of MONETIZATION_MODEL_CARDS) {
      expect(screen.getByText(card.name)).toBeInTheDocument();
    }
  });

  it("shows each model card's name, description, and `Best when` note", async () => {
    const user = userEvent.setup();
    renderWizard();
    await user.click(screen.getByRole("button", { name: /^next$/i }));

    for (const card of MONETIZATION_MODEL_CARDS) {
      expect(screen.getByText(card.name)).toBeInTheDocument();
      expect(screen.getByText(card.description)).toBeInTheDocument();
      expect(
        screen.getByText((text) => text.includes(card.bestWhen))
      ).toBeInTheDocument();
    }
  });

  it("keeps the Next button disabled while 0 models are selected on step 2", async () => {
    const user = userEvent.setup();
    renderWizard();
    await user.click(screen.getByRole("button", { name: /^next$/i }));

    expect(screen.getByRole("button", { name: /^next$/i })).toBeDisabled();
  });

  it("enables Next once at least one model is selected and advances to step 3", async () => {
    const user = userEvent.setup();
    renderWizard();
    await user.click(screen.getByRole("button", { name: /^next$/i }));

    await user.click(screen.getByRole("button", { name: /paid membership/i }));
    const nextButton = screen.getByRole("button", { name: /^next$/i });
    expect(nextButton).toBeEnabled();

    await user.click(nextButton);

    expect(
      screen.getByRole("heading", { name: /confirm your selection/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /activate/i })
    ).toBeInTheDocument();
  });

  it("shows a confirmation list of selected models on step 3", async () => {
    const user = userEvent.setup();
    renderWizard();
    await user.click(screen.getByRole("button", { name: /^next$/i }));

    await user.click(screen.getByRole("button", { name: /paid membership/i }));
    await user.click(screen.getByRole("button", { name: /courses/i }));

    await user.click(screen.getByRole("button", { name: /^next$/i }));

    const list = screen.getByRole("list", { name: /selected models/i });
    expect(list).toHaveTextContent("Paid membership");
    expect(list).toHaveTextContent("Courses");
    expect(list).not.toHaveTextContent("Sponsorships");
  });

  it("calls the save mutation with the selected models when Activate is clicked", async () => {
    const user = userEvent.setup();
    renderWizard();
    await user.click(screen.getByRole("button", { name: /^next$/i }));

    await user.click(screen.getByRole("button", { name: /paid membership/i }));
    await user.click(screen.getByRole("button", { name: /courses/i }));
    await user.click(screen.getByRole("button", { name: /^next$/i }));

    await user.click(screen.getByRole("button", { name: /activate/i }));

    expect(mockSave.mutateAsync).toHaveBeenCalledTimes(1);
    const payload = mockSave.mutateAsync.mock.calls[0][0];
    expect(payload.selectedModels).toEqual(["paid_membership", "courses"]);
    expect(typeof payload.completedAt).toBe("string");
    expect(new Date(payload.completedAt).toString()).not.toBe("Invalid Date");
  });

  it("pre-selects the saved models on step 2 when defaultSelected is provided", async () => {
    const user = userEvent.setup();
    renderWizard({ defaultSelected: ["events", "sponsorships"] });
    await user.click(screen.getByRole("button", { name: /^next$/i }));

    await user.click(screen.getByRole("button", { name: /^next$/i }));

    const list = screen.getByRole("list", { name: /selected models/i });
    expect(list).toHaveTextContent("Events");
    expect(list).toHaveTextContent("Sponsorships");
  });
});

describe("MonetizationSetup page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSave.mutateAsync.mockReset();
    mockSave.mutateAsync.mockResolvedValue(undefined);
  });

  it("shows an 'Edit your model' label instead of the wizard trigger when config already exists", () => {
    mockUseConfig.mockReturnValue({
      data: {
        selectedModels: ["paid_membership"],
        completedAt: "2026-05-11T12:00:00.000Z",
      },
      isLoading: false,
    });

    renderSetup();

    expect(
      screen.getByRole("button", { name: /edit your model/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /pick your monetization/i })
    ).not.toBeInTheDocument();
  });

  it("shows the wizard trigger CTA when no config exists", () => {
    mockUseConfig.mockReturnValue({ data: null, isLoading: false });

    renderSetup();

    expect(
      screen.getByRole("button", { name: /pick your monetization/i })
    ).toBeInTheDocument();
  });
});
