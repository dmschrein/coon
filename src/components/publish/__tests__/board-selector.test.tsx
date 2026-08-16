import { describe, it, expect, beforeAll, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BoardSelector } from "../board-selector";
import type { PinterestBoard } from "@/types";

// Radix Select drives its popup with pointer capture APIs jsdom does not implement
beforeAll(() => {
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
});

// Mirrors connected_accounts.metadata for a Pinterest account
const accountMetadata: { boards: PinterestBoard[] } = {
  boards: [
    { id: "board-1", name: "Recipes" },
    { id: "board-2", name: "Travel" },
  ],
};

describe("BoardSelector", () => {
  it("renders the boards from connected account metadata", async () => {
    const user = userEvent.setup();
    render(
      <BoardSelector
        boards={accountMetadata.boards}
        value={null}
        onChange={vi.fn()}
      />
    );

    await user.click(screen.getByRole("combobox"));

    expect(screen.getByRole("option", { name: "Recipes" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Travel" })).toBeInTheDocument();
  });

  it("reports the selected board id to the caller", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <BoardSelector
        boards={accountMetadata.boards}
        value={null}
        onChange={onChange}
      />
    );

    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("option", { name: "Travel" }));

    expect(onChange).toHaveBeenCalledWith("board-2");
  });

  it("shows 'No boards' and disables selection when metadata has no boards", () => {
    render(<BoardSelector boards={[]} value={null} onChange={vi.fn()} />);

    expect(screen.getByText("No boards")).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeDisabled();
  });
});
