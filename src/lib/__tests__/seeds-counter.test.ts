import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  readSeedsThisWeek,
  incrementSeedsThisWeek,
  subscribeToSeedsCounter,
} from "../seeds-counter";

describe("seeds-counter", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useRealTimers();
  });

  describe("readSeedsThisWeek", () => {
    it("returns 0 when campaignId is null", () => {
      expect(readSeedsThisWeek(null)).toBe(0);
    });

    it("returns 0 when no value stored", () => {
      expect(readSeedsThisWeek("campaign-1")).toBe(0);
    });

    it("reads the stored count for the current week", () => {
      incrementSeedsThisWeek("campaign-1", 5);
      expect(readSeedsThisWeek("campaign-1")).toBe(5);
    });

    it("returns 0 when stored value is non-numeric", () => {
      // Find the key by incrementing then overwriting with garbage
      incrementSeedsThisWeek("campaign-x", 1);
      const key = Object.keys(localStorage).find((k) =>
        k.includes("campaign-x")
      )!;
      window.localStorage.setItem(key, "not-a-number");
      expect(readSeedsThisWeek("campaign-x")).toBe(0);
    });
  });

  describe("incrementSeedsThisWeek", () => {
    it("returns 0 and does nothing when campaignId is null", () => {
      expect(incrementSeedsThisWeek(null, 3)).toBe(0);
    });

    it("returns 0 when increment amount is zero or negative", () => {
      expect(incrementSeedsThisWeek("campaign-1", 0)).toBe(0);
      expect(incrementSeedsThisWeek("campaign-1", -5)).toBe(0);
      expect(readSeedsThisWeek("campaign-1")).toBe(0);
    });

    it("increments from zero", () => {
      expect(incrementSeedsThisWeek("campaign-1", 3)).toBe(3);
    });

    it("accumulates across multiple increments", () => {
      incrementSeedsThisWeek("campaign-1", 2);
      incrementSeedsThisWeek("campaign-1", 4);
      expect(readSeedsThisWeek("campaign-1")).toBe(6);
    });

    it("keeps counts isolated per campaign", () => {
      incrementSeedsThisWeek("campaign-a", 2);
      incrementSeedsThisWeek("campaign-b", 9);
      expect(readSeedsThisWeek("campaign-a")).toBe(2);
      expect(readSeedsThisWeek("campaign-b")).toBe(9);
    });

    it("dispatches a coon:seeds-counter-updated event with detail", () => {
      const handler = vi.fn();
      window.addEventListener("coon:seeds-counter-updated", handler);

      incrementSeedsThisWeek("campaign-1", 7);

      expect(handler).toHaveBeenCalledTimes(1);
      const event = handler.mock.calls[0][0] as CustomEvent;
      expect(event.detail).toEqual({ campaignId: "campaign-1", count: 7 });

      window.removeEventListener("coon:seeds-counter-updated", handler);
    });
  });

  describe("subscribeToSeedsCounter", () => {
    it("invokes the callback on increment and unsubscribes cleanly", () => {
      const callback = vi.fn();
      const unsubscribe = subscribeToSeedsCounter(callback);

      incrementSeedsThisWeek("campaign-1", 1);
      expect(callback).toHaveBeenCalledTimes(1);

      unsubscribe();
      incrementSeedsThisWeek("campaign-1", 1);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it("returns a noop unsubscribe without throwing", () => {
      const unsubscribe = subscribeToSeedsCounter(() => {});
      expect(() => unsubscribe()).not.toThrow();
    });
  });
});
