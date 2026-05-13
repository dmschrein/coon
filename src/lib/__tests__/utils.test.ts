import { describe, it, expect } from "vitest";
import { csvFromRows } from "@/lib/utils";

describe("csvFromRows", () => {
  it("places headers in the first row of output", () => {
    const csv = csvFromRows(
      ["Date", "Type", "Amount"],
      [["2026-05-01", "membership", "1000"]]
    );
    const firstLine = csv.split(/\r?\n/)[0];
    expect(firstLine).toBe("Date,Type,Amount");
  });

  it("wraps a cell containing a comma in double quotes", () => {
    const csv = csvFromRows(["A"], [["one, two"]]);
    expect(csv).toContain('"one, two"');
  });

  it("escapes a double-quote character as two double-quotes (RFC 4180)", () => {
    const csv = csvFromRows(["A"], [['she said "hi"']]);
    // Field with a quote must be wrapped and the internal quotes doubled.
    expect(csv).toContain('"she said ""hi"""');
  });
});
