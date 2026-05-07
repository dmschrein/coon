/**
 * Workflow Service - Evaluates user-defined trigger rules against member events
 * and dispatches actions (inbox draft, tag, notification).
 *
 * Outreach drafting is wrapped in the orchestration stack
 * (AgentQueue → CircuitBreaker) so a misbehaving Claude call cannot stall
 * other actions.
 */

import type {
  WorkflowRepository,
  WorkflowTriggerRow,
  InboxRepository,
  NotificationRepository,
  PlatformMemberRepository,
  PlatformMemberRow,
  AudienceProfileRepository,
} from "../repositories/interfaces";
import type {
  WorkflowAction,
  WorkflowEventType,
  WorkflowOutreachInput,
  WorkflowOutreachOutput,
} from "@/lib/validations/workflow";
import { AgentQueue } from "@/lib/orchestration/agent-queue";
import { CircuitBreaker } from "@/lib/orchestration/circuit-breaker";

interface OutreachDrafterAgent {
  draftOutreach(input: WorkflowOutreachInput): Promise<{
    result: WorkflowOutreachOutput;
    modelUsed: string;
    tokensUsed: number;
  }>;
}

export interface WorkflowEventContext {
  member: PlatformMemberRow;
  communityName: string;
  triggerReason: string;
  campaignId?: string | null;
  contentId?: string | null;
}

export interface WorkflowExecutionSummary {
  triggersFired: number;
  actionsExecuted: number;
  actionsFailed: number;
}

/**
 * Pure function: evaluates a trigger's `conditions` blob against the event
 * context. Exported for unit testing.
 */
export function evaluateConditions(
  conditions: Record<string, unknown>,
  context: WorkflowEventContext
): boolean {
  if (
    typeof conditions.minEngagement === "number" &&
    context.member.engagementCount < conditions.minEngagement
  ) {
    return false;
  }
  if (
    typeof conditions.platform === "string" &&
    context.member.platform !== conditions.platform
  ) {
    return false;
  }
  if (
    typeof conditions.requireTag === "string" &&
    !context.member.tags.includes(conditions.requireTag)
  ) {
    return false;
  }
  return true;
}

export class WorkflowService {
  constructor(
    private workflowRepo: WorkflowRepository,
    private inboxRepo: InboxRepository,
    private notificationRepo: NotificationRepository,
    private platformMemberRepo: PlatformMemberRepository,
    private profileRepo: AudienceProfileRepository,
    private outreachAgent: OutreachDrafterAgent,
    private orchestration: { queue: AgentQueue; circuitBreaker: CircuitBreaker }
  ) {}

  // ─── Event Evaluation ──────────────────────────────────────────────────────

  async evaluateTriggersForEvent(
    userId: string,
    eventType: WorkflowEventType,
    context: WorkflowEventContext
  ): Promise<WorkflowExecutionSummary> {
    const triggers = await this.workflowRepo.listActiveForUserAndEvent(
      userId,
      eventType
    );

    let triggersFired = 0;
    let actionsExecuted = 0;
    let actionsFailed = 0;

    for (const trigger of triggers) {
      if (!evaluateConditions(trigger.conditions, context)) continue;
      triggersFired++;

      const settled = await Promise.allSettled(
        trigger.actions.map((action) =>
          this.executeAction(userId, trigger, action, context)
        )
      );

      for (const result of settled) {
        if (result.status === "fulfilled") actionsExecuted++;
        else actionsFailed++;
      }
    }

    return { triggersFired, actionsExecuted, actionsFailed };
  }

  // ─── Action Dispatcher ─────────────────────────────────────────────────────

  private async executeAction(
    userId: string,
    trigger: WorkflowTriggerRow,
    action: WorkflowAction,
    ctx: WorkflowEventContext
  ): Promise<void> {
    try {
      if (action.type === "create_inbox_draft") {
        await this.createInboxDraft(userId, trigger, action.templateHint, ctx);
        return;
      }
      if (action.type === "apply_tag") {
        await this.applyTag(action.tag, ctx);
        return;
      }
      if (action.type === "create_notification") {
        await this.createNotification(userId, trigger, action.message, ctx);
        return;
      }
    } catch (err) {
      console.error("Workflow action failed", {
        triggerId: trigger.id,
        actionType: (action as { type: string }).type,
        err,
      });
      throw err;
    }
  }

  private async createInboxDraft(
    userId: string,
    trigger: WorkflowTriggerRow,
    templateHint: string,
    ctx: WorkflowEventContext
  ): Promise<void> {
    const profile = await this.profileRepo.findActiveByUserId(userId);
    const audienceProfile = profile
      ? this.summarizeProfile(profile.profileData)
      : null;

    const { queue, circuitBreaker } = this.orchestration;
    const { result } = await queue.enqueue({
      id: `outreach-${trigger.id}-${ctx.member.id}-${Date.now()}`,
      agentType: "outreach-drafter",
      priority: 5,
      execute: () =>
        circuitBreaker.execute(() =>
          this.outreachAgent.draftOutreach({
            triggerReason: ctx.triggerReason,
            memberHandle: ctx.member.username,
            platform: ctx.member.platform,
            communityName: ctx.communityName,
            audienceProfile,
            templateHint,
          })
        ),
    });

    await this.inboxRepo.createItem({
      userId,
      campaignId: ctx.campaignId ?? null,
      contentId: ctx.contentId ?? null,
      platform: ctx.member.platform,
      authorHandle: ctx.member.username,
      authorDisplayName: ctx.member.displayName ?? undefined,
      messageText: result.message,
      messageType: "draft",
      platformMessageId: `wf-${trigger.id}-${ctx.member.id}-${Date.now()}`,
      receivedAt: new Date(),
    });
  }

  private async applyTag(
    tag: string,
    ctx: WorkflowEventContext
  ): Promise<void> {
    if (ctx.member.tags.includes(tag)) return;
    const nextTags = [...ctx.member.tags, tag];
    await this.platformMemberRepo.updateMember(ctx.member.id, {
      tags: nextTags,
    });
  }

  private async createNotification(
    userId: string,
    trigger: WorkflowTriggerRow,
    message: string,
    ctx: WorkflowEventContext
  ): Promise<void> {
    await this.notificationRepo.createNotification({
      userId,
      type: "workflow",
      title: trigger.name,
      body: message,
      link: `/dashboard/community/${ctx.member.id}`,
    });
  }

  private summarizeProfile(profileData: unknown): string | null {
    if (!profileData || typeof profileData !== "object") return null;
    const data = profileData as {
      primaryPersonas?: { name?: string }[];
      brandVoice?: { summary?: string };
    };
    const personas = data.primaryPersonas
      ?.map((p) => p.name)
      .filter(Boolean)
      .join(", ");
    const voice = data.brandVoice?.summary;
    const parts = [
      personas ? `Personas: ${personas}` : null,
      voice ? `Brand voice: ${voice}` : null,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(". ") : null;
  }

  // ─── CRUD ──────────────────────────────────────────────────────────────────

  async listForUser(userId: string): Promise<WorkflowTriggerRow[]> {
    return this.workflowRepo.listForUser(userId);
  }

  async findById(
    id: string,
    userId: string
  ): Promise<WorkflowTriggerRow | null> {
    return this.workflowRepo.findById(id, userId);
  }

  async create(
    userId: string,
    input: {
      name: string;
      eventType: WorkflowEventType;
      conditions: Record<string, unknown>;
      actions: WorkflowAction[];
      isActive: boolean;
    }
  ): Promise<WorkflowTriggerRow> {
    return this.workflowRepo.create({ userId, ...input });
  }

  async update(
    id: string,
    userId: string,
    patch: {
      name?: string;
      eventType?: WorkflowEventType;
      conditions?: Record<string, unknown>;
      actions?: WorkflowAction[];
      isActive?: boolean;
    }
  ): Promise<WorkflowTriggerRow | null> {
    return this.workflowRepo.update(id, userId, patch);
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.workflowRepo.delete(id, userId);
  }
}
