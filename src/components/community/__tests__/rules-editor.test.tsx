import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RulesEditor } from "../rules-editor";
import type { CommunityRule } from "@/types";

const rule = (title: string): CommunityRule => ({
  title,
  description: `${title} description`,
  exampleViolation: `${title} violation`,
  enforcement: `${title} enforcement`,
});

const rules: CommunityRule[] = [rule("Alpha"), rule("Bravo"), rule("Charlie")];

function rowOf(title: string): HTMLElement {
  const input = screen.getByDisplayValue(title);
  const row = input.closest("[data-rule-row]");
  if (!row) throw new Error(`row for ${title} not found`);
  return row as HTMLElement;
}

describe("RulesEditor", () => {
  it("numbers rules from 1 in their initial order", () => {
    render(<RulesEditor communityName="Pixel Forge" rules={rules} />);
    expect(
      within(rowOf("Alpha")).getByText("1", { selector: "[data-rule-number]" })
    ).toBeInTheDocument();
    expect(
      within(rowOf("Charlie")).getByText("3", {
        selector: "[data-rule-number]",
      })
    ).toBeInTheDocument();
  });

  it("renumbers when a rule is reordered (rule #1 moved past two others becomes #3)", async () => {
    render(<RulesEditor communityName="Pixel Forge" rules={rules} />);

    // Move "Alpha" (rule #1) down twice so it lands in position 3.
    await userEvent.click(
      within(rowOf("Alpha")).getByRole("button", { name: /move .*down/i })
    );
    await userEvent.click(
      within(rowOf("Alpha")).getByRole("button", { name: /move .*down/i })
    );

    expect(
      within(rowOf("Alpha")).getByText("3", { selector: "[data-rule-number]" })
    ).toBeInTheDocument();
    expect(
      within(rowOf("Bravo")).getByText("1", { selector: "[data-rule-number]" })
    ).toBeInTheDocument();
  });

  it("appends a blank editable rule when Add Rule is clicked", async () => {
    render(<RulesEditor communityName="Pixel Forge" rules={rules} />);
    expect(screen.getAllByPlaceholderText(/rule title/i)).toHaveLength(3);
    await userEvent.click(screen.getByRole("button", { name: /add rule/i }));
    expect(screen.getAllByPlaceholderText(/rule title/i)).toHaveLength(4);
  });

  it("removes a rule and renumbers the rest when delete is clicked", async () => {
    render(<RulesEditor communityName="Pixel Forge" rules={rules} />);
    await userEvent.click(
      within(rowOf("Alpha")).getByRole("button", { name: /delete rule/i })
    );
    expect(screen.queryByDisplayValue("Alpha")).not.toBeInTheDocument();
    expect(
      within(rowOf("Bravo")).getByText("1", { selector: "[data-rule-number]" })
    ).toBeInTheDocument();
  });
});
