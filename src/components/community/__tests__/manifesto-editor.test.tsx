import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ManifestoEditor } from "../manifesto-editor";
import { manifestoOutputFixture } from "@/lib/agents/__fixtures__/manifesto";

describe("ManifestoEditor", () => {
  it("renders exactly 3 name suggestion chips", () => {
    render(<ManifestoEditor manifesto={manifestoOutputFixture} />);
    for (const name of manifestoOutputFixture.nameSuggestions) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
  });

  it("fills the Community Name input when a name chip is clicked", async () => {
    render(<ManifestoEditor manifesto={manifestoOutputFixture} />);

    const input = screen.getByLabelText(/community name/i) as HTMLInputElement;
    expect(input.value).toBe("");

    const chipText = manifestoOutputFixture.nameSuggestions[1];
    await userEvent.click(screen.getByRole("button", { name: chipText }));

    expect(input.value).toBe(chipText);
  });
});
