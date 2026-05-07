import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  WorkflowService,
  evaluateConditions,
  type WorkflowEventContext,
} from "../workflow-service";
import type {
  WorkflowRepository,
  WorkflowTriggerRow,
  InboxRepository,
  NotificationRepository,
  PlatformMemberRepository,
  PlatformMemberRow,
  AudienceProfileRepository,
} from "../../repositories/interfaces";
import type { AgentQueue } from "@/lib/orchestration/agent-queue";
import type { CircuitBreaker } from "@/lib/orchestration/circuit-breaker";
import type {
  WorkflowAction,
  WorkflowOutreachOutput,
} from "@/lib/validations/workflow";

const makeMember = (
  overrides: Partial<PlatformMemberRow> = {}
): PlatformMemberRow => ({
  id: "member-1",
  userId: "user-1",
  platform: "twitter",
  platformUserId: "tw-99",
  username: "@friend",
  displayName: "Friend",
  firstSeenAt: new Date("2026-04-01"),
  engagementCount: 1,
  lastSeenAt: new Date("2026-04-15"),
  status: "prospect",
  tags: [],
  notes: null,
  ...overrides,
});

const makeContext = (
  overrides: Partial<WorkflowEventContext> = {}
): WorkflowEventContext => ({
  member: makeMember(),
  communityName: "Indie Builders",
  triggerReason: "new_member",
  campaignId: null,
  contentId: "content-1",
  ...overrides,
});

const makeTrigger = (
  overrides: Partial<WorkflowTriggerRow> = {}
): WorkflowTriggerRow => ({
  id: "trigger-1",
  userId: "user-1",
  name: "Welcome",
  eventType: "new_member",
  conditions: {},
  actions: [],
  isActive: true,
  createdAt: new Date(),
  ...overrides,
});

describe("evaluateConditions", () => {
  it("returns false when minEngagement is unmet", () => {
    const ctx = makeContext({ member: makeMember({ engagementCount: 3 }) });
    expect(evaluateConditions({ minEngagement: 5 }, ctx)).toBe(false);
  });

  it("returns true when minEngagement is met", () => {
    const ctx = makeContext({ member: makeMember({ engagementCount: 7 }) });
    expect(evaluateConditions({ minEngagement: 5 }, ctx)).toBe(true);
  });

  it("returns true when conditions are empty", () => {
    expect(evaluateConditions({}, makeContext())).toBe(true);
  });

  it("returns false when platform does not match", () => {
    const ctx = makeContext({ member: makeMember({ platform: "twitter" }) });
    expect(evaluateConditions({ platform: "linkedin" }, ctx)).toBe(false);
  });

  it("returns false when requireTag is missing", () => {
    const ctx = makeContext({ member: makeMember({ tags: ["beta"] }) });
    expect(evaluateConditions({ requireTag: "vip" }, ctx)).toBe(false);
  });

  it("returns true when requireTag is present", () => {
    const ctx = makeContext({ member: makeMember({ tags: ["vip"] }) });
    expect(evaluateConditions({ requireTag: "vip" }, ctx)).toBe(true);
  });
});

describe("WorkflowService.evaluateTriggersForEvent", () => {
  let workflowRepo: {
    [K in keyof WorkflowRepository]: ReturnType<typeof vi.fn>;
  };
  let inboxRepo: {
    [K in keyof InboxRepository]: ReturnType<typeof vi.fn>;
  };
  let notificationRepo: {
    [K in keyof NotificationRepository]: ReturnType<typeof vi.fn>;
  };
  let platformMemberRepo: {
    [K in keyof PlatformMemberRepository]: ReturnType<typeof vi.fn>;
  };
  let profileRepo: {
    [K in keyof AudienceProfileRepository]: ReturnType<typeof vi.fn>;
  };
  let outreachAgent: { draftOutreach: ReturnType<typeof vi.fn> };
  let queue: { enqueue: ReturnType<typeof vi.fn> };
  let circuitBreaker: { execute: ReturnType<typeof vi.fn> };
  let service: WorkflowService;

  beforeEach(() => {
    workflowRepo = {
      listActiveForUserAndEvent: vi.fn(),
      listForUser: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    inboxRepo = {
      createItem: vi.fn(),
      listItems: vi.fn(),
      getItem: vi.fn(),
      updateStatus: vi.fn(),
      setFlagged: vi.fn(),
      markAllFromAuthorRead: vi.fn(),
      countUnread: vi.fn(),
    };
    notificationRepo = {
      createNotification: vi.fn(),
      listNotifications: vi.fn(),
      findExistingByLink: vi.fn(),
      markAllRead: vi.fn(),
      countUnread: vi.fn(),
    };
    platformMemberRepo = {
      upsertPlatformMember: vi.fn(),
      createMember: vi.fn(),
      getMembersByUserId: vi.fn(),
      listMembers: vi.fn(),
      getMember: vi.fn(),
      updateMember: vi.fn(),
      deleteMember: vi.fn(),
      findInactiveMembers: vi.fn(),
      markInactiveFired: vi.fn(),
    };
    profileRepo = {
      findActiveByUserId: vi.fn().mockResolvedValue(null),
      findById: vi.fn(),
      create: vi.fn(),
      deactivateAllForUser: vi.fn(),
      updateProfileData: vi.fn(),
    };
    outreachAgent = { draftOutreach: vi.fn() };
    queue = {
      enqueue: vi.fn(async ({ execute }) => execute()),
    };
    circuitBreaker = {
      execute: vi.fn(async (fn: () => Promise<unknown>) => fn()),
    };

    service = new WorkflowService(
      workflowRepo as unknown as WorkflowRepository,
      inboxRepo as unknown as InboxRepository,
      notificationRepo as unknown as NotificationRepository,
      platformMemberRepo as unknown as PlatformMemberRepository,
      profileRepo as unknown as AudienceProfileRepository,
      outreachAgent as unknown as {
        draftOutreach: (input: unknown) => Promise<{
          result: WorkflowOutreachOutput;
          modelUsed: string;
          tokensUsed: number;
        }>;
      },
      {
        queue: queue as unknown as AgentQueue,
        circuitBreaker: circuitBreaker as unknown as CircuitBreaker,
      }
    );
  });

  it("does not fire actions when conditions evaluate to false", async () => {
    workflowRepo.listActiveForUserAndEvent.mockResolvedValue([
      makeTrigger({
        conditions: { minEngagement: 5 },
        actions: [{ type: "create_inbox_draft", templateHint: "warm welcome" }],
      }),
    ]);

    const summary = await service.evaluateTriggersForEvent(
      "user-1",
      "new_member",
      makeContext({ member: makeMember({ engagementCount: 3 }) })
    );

    expect(summary.triggersFired).toBe(0);
    expect(summary.actionsExecuted).toBe(0);
    expect(inboxRepo.createItem).not.toHaveBeenCalled();
    expect(outreachAgent.draftOutreach).not.toHaveBeenCalled();
  });

  it("creates an inbox draft with AI-drafted message_text on new_member", async () => {
    const drafterOutput: WorkflowOutreachOutput = {
      message: "Welcome to the community!",
      tone: "warm",
    };
    outreachAgent.draftOutreach.mockResolvedValue({
      result: drafterOutput,
      modelUsed: "claude-sonnet-4-20250514",
      tokensUsed: 200,
    });
    inboxRepo.createItem.mockResolvedValue({ id: "inbox-1" });

    workflowRepo.listActiveForUserAndEvent.mockResolvedValue([
      makeTrigger({
        actions: [{ type: "create_inbox_draft", templateHint: "warm welcome" }],
      }),
    ]);

    const summary = await service.evaluateTriggersForEvent(
      "user-1",
      "new_member",
      makeContext()
    );

    expect(summary.triggersFired).toBe(1);
    expect(summary.actionsExecuted).toBe(1);
    expect(outreachAgent.draftOutreach).toHaveBeenCalledWith(
      expect.objectContaining({
        triggerReason: "new_member",
        memberHandle: "@friend",
        platform: "twitter",
        templateHint: "warm welcome",
      })
    );
    expect(inboxRepo.createItem).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        platform: "twitter",
        authorHandle: "@friend",
        messageText: "Welcome to the community!",
        messageType: "draft",
      })
    );
  });

  it("invokes all action handlers for a trigger with multiple actions", async () => {
    outreachAgent.draftOutreach.mockResolvedValue({
      result: { message: "hi", tone: "warm" },
      modelUsed: "claude-sonnet-4-20250514",
      tokensUsed: 100,
    });
    inboxRepo.createItem.mockResolvedValue({ id: "inbox-1" });
    platformMemberRepo.updateMember.mockResolvedValue(makeMember());
    notificationRepo.createNotification.mockResolvedValue({ id: "n-1" });

    const actions: WorkflowAction[] = [
      { type: "create_inbox_draft", templateHint: "hint" },
      { type: "apply_tag", tag: "vip" },
      { type: "create_notification", message: "Hi there" },
    ];
    workflowRepo.listActiveForUserAndEvent.mockResolvedValue([
      makeTrigger({ actions }),
    ]);

    const summary = await service.evaluateTriggersForEvent(
      "user-1",
      "new_member",
      makeContext()
    );

    expect(summary.triggersFired).toBe(1);
    expect(summary.actionsExecuted).toBe(3);
    expect(inboxRepo.createItem).toHaveBeenCalledTimes(1);
    expect(platformMemberRepo.updateMember).toHaveBeenCalledWith(
      "member-1",
      expect.objectContaining({ tags: ["vip"] })
    );
    expect(notificationRepo.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        type: "workflow",
        body: "Hi there",
      })
    );
  });

  it("continues executing remaining actions when one fails", async () => {
    outreachAgent.draftOutreach.mockRejectedValue(new Error("Claude down"));
    platformMemberRepo.updateMember.mockResolvedValue(makeMember());
    notificationRepo.createNotification.mockResolvedValue({ id: "n-1" });

    workflowRepo.listActiveForUserAndEvent.mockResolvedValue([
      makeTrigger({
        actions: [
          { type: "create_inbox_draft", templateHint: "hint" },
          { type: "apply_tag", tag: "vip" },
          { type: "create_notification", message: "Hi" },
        ],
      }),
    ]);

    const summary = await service.evaluateTriggersForEvent(
      "user-1",
      "new_member",
      makeContext()
    );

    expect(summary.actionsExecuted).toBe(2);
    expect(summary.actionsFailed).toBe(1);
    expect(platformMemberRepo.updateMember).toHaveBeenCalled();
    expect(notificationRepo.createNotification).toHaveBeenCalled();
  });
});
