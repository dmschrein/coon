import { describe, it, expect } from "vitest";
import { TikTokAdapter } from "../tiktok";
import { NotImplementedError } from "../types";

describe("StubAdapter (via TikTokAdapter)", () => {
  const adapter = new TikTokAdapter();

  it("has correct platform", () => {
    expect(adapter.platform).toBe("tiktok");
  });

  it("throws NotImplementedError for getAuthUrl", () => {
    expect(() => adapter.getAuthUrl("http://x", "state")).toThrow(
      NotImplementedError
    );
  });

  it("throws NotImplementedError for exchangeCode", async () => {
    await expect(adapter.exchangeCode("code", "http://x")).rejects.toThrow(
      NotImplementedError
    );
  });

  it("throws NotImplementedError for getAccountInfo", async () => {
    await expect(adapter.getAccountInfo("token")).rejects.toThrow(
      NotImplementedError
    );
  });

  it("throws NotImplementedError for post", async () => {
    await expect(adapter.post("token", { body: "hi" })).rejects.toThrow(
      NotImplementedError
    );
  });

  it("throws NotImplementedError for fetchEngagement", async () => {
    await expect(adapter.fetchEngagement("id", "token")).rejects.toThrow(
      NotImplementedError
    );
  });
});
