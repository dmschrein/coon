import { describe, it, expect } from "vitest";
import { CampaignContentEntity, ContentStateError } from "../content";

function createTestContent() {
  return CampaignContentEntity.create({
    id: "content-1",
    campaignId: "campaign-1",
    userId: "user-1",
    platform: "twitter",
  });
}

describe("CampaignContentEntity", () => {
  describe("create()", () => {
    it("creates content in pending state", () => {
      const content = createTestContent();
      expect(content.id).toBe("content-1");
      expect(content.platform).toBe("twitter");
      expect(content.status).toBe("pending");
      expect(content.contentData).toBeNull();
      expect(content.tokensUsed).toBeNull();
      expect(content.errorMessage).toBeNull();
    });
  });

  describe("state checks", () => {
    it("isPending returns true for new content", () => {
      const content = createTestContent();
      expect(content.isPending()).toBe(true);
      expect(content.isGenerating()).toBe(false);
      expect(content.isComplete()).toBe(false);
      expect(content.isFailed()).toBe(false);
    });

    it("canRetry returns true for pending and failed", () => {
      const content = createTestContent();
      expect(content.canRetry()).toBe(true);

      content.markFailed("error");
      expect(content.canRetry()).toBe(true);
    });

    it("canRetry returns false for generating and complete", () => {
      const content = createTestContent();
      content.markGenerating();
      expect(content.canRetry()).toBe(false);

      content.markComplete({ data: "test" }, 100);
      expect(content.canRetry()).toBe(false);
    });
  });

  describe("markGenerating()", () => {
    it("transitions from pending to generating", () => {
      const content = createTestContent();
      content.markGenerating();

      expect(content.isGenerating()).toBe(true);
      expect(content.errorMessage).toBeNull();
    });

    it("transitions from failed to generating", () => {
      const content = createTestContent();
      content.markFailed("previous error");
      content.markGenerating();

      expect(content.isGenerating()).toBe(true);
      expect(content.errorMessage).toBeNull();
    });

    it("throws from generating state", () => {
      const content = createTestContent();
      content.markGenerating();

      expect(() => content.markGenerating()).toThrow(ContentStateError);
    });

    it("throws from complete state", () => {
      const content = createTestContent();
      content.markGenerating();
      content.markComplete({ data: "test" }, 100);

      expect(() => content.markGenerating()).toThrow(ContentStateError);
    });
  });

  describe("markComplete()", () => {
    it("sets content data and tokens", () => {
      const content = createTestContent();
      content.markGenerating();
      content.markComplete({ tweets: ["hello"] }, 250);

      expect(content.isComplete()).toBe(true);
      expect(content.contentData).toEqual({ tweets: ["hello"] });
      expect(content.tokensUsed).toBe(250);
      expect(content.errorMessage).toBeNull();
    });
  });

  describe("markFailed()", () => {
    it("sets error message", () => {
      const content = createTestContent();
      content.markFailed("API timeout");

      expect(content.isFailed()).toBe(true);
      expect(content.errorMessage).toBe("API timeout");
    });
  });

  describe("approval status", () => {
    it("defaults to pending_review", () => {
      const content = createTestContent();
      expect(content.approvalStatus).toBe("pending_review");
      expect(content.isPendingReview()).toBe(true);
    });

    it("setApprovalStatus updates status", () => {
      const content = createTestContent();
      content.setApprovalStatus("approved");
      expect(content.isApproved()).toBe(true);
      expect(content.isPendingReview()).toBe(false);
    });

    it("isRejected returns true when rejected", () => {
      const content = createTestContent();
      content.setApprovalStatus("rejected");
      expect(content.isRejected()).toBe(true);
    });

    it("needsRevision returns true when needs_revision", () => {
      const content = createTestContent();
      content.setApprovalStatus("needs_revision");
      expect(content.needsRevision()).toBe(true);
    });
  });

  describe("create() with optional fields", () => {
    it("accepts title and pillar", () => {
      const content = CampaignContentEntity.create({
        id: "content-2",
        campaignId: "campaign-1",
        userId: "user-1",
        platform: "instagram",
        title: "My Post",
        pillar: "education",
      });
      expect(content.title).toBe("My Post");
      expect(content.pillar).toBe("education");
      expect(content.body).toBeNull();
      expect(content.scheduledFor).toBeNull();
    });
  });
});
