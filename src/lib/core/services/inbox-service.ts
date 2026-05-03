/**
 * Inbox Service - Orchestrates inbox-item creation with AI moderation,
 * and handles moderation actions (approve / hide / block_sender).
 *
 * Inbox creation is wrapped in the orchestration stack
 * (AgentQueue → CircuitBreaker) before invoking the moderation agent.
 */

import type {
  InboxRepository,
  InboxItemRow,
  BlockedSenderRepository,
  BlockedSenderRow,
} from "../repositories/interfaces";
import { createOrchestration } from "@/lib/orchestration";
import type {
  ModerationAction,
  ModerationCheckerInput,
  ModerationCheckerOutput,
} from "@/lib/validations/inbox";

interface ModerationCheckerAgent {
  checkModeration(input: ModerationCheckerInput): Promise<{
    result: ModerationCheckerOutput;
    modelUsed: string;
    tokensUsed: number;
  }>;
}

const { queue, circuitBreaker } = createOrchestration();

export interface CreateInboxItemInput {
  userId: string;
  campaignId?: string | null;
  contentId?: string | null;
  platform: string;
  authorHandle: string;
  authorDisplayName?: string;
  messageText: string;
  messageType: string;
  platformMessageId: string;
  receivedAt: Date;
}

export interface ModerationActionResult {
  itemId: string;
  action: ModerationAction["action"];
  affectedItems: number;
  blockedSender: BlockedSenderRow | null;
}

export class InboxService {
  constructor(
    private inboxRepo: InboxRepository,
    private blockedSenderRepo: BlockedSenderRepository,
    private moderationAgent: ModerationCheckerAgent | null = null
  ) {}

  /**
   * Create an inbox item, running the moderation agent first to populate
   * `flagged`, `flagReason`, and `flagCategory`. If the agent fails, the
   * item is still created (unflagged) so ingestion is never blocked.
   */
  async createInboxItemWithModeration(
    input: CreateInboxItemInput
  ): Promise<InboxItemRow> {
    let flagged = false;
    let flagReason: string | null = null;
    let flagCategory: string | null = null;

    if (this.moderationAgent) {
      try {
        const { result } = await queue.enqueue({
          id: `moderation-${input.platformMessageId}`,
          agentType: "moderation-checker",
          priority: 5,
          execute: () =>
            circuitBreaker.execute(() =>
              this.moderationAgent!.checkModeration({
                messageText: input.messageText,
                authorHandle: input.authorHandle,
                platform: input.platform,
              })
            ),
        });

        flagged = result.flagged;
        flagReason = result.reason ?? null;
        flagCategory = result.category ?? null;
      } catch (err) {
        console.error("Moderation check failed; creating item unflagged", err);
      }
    }

    return this.inboxRepo.createItem({
      ...input,
      flagged,
      flagReason,
      flagCategory,
    });
  }

  /**
   * Apply a moderation action to an inbox item.
   * - approve: clears the flag
   * - hide: marks the item as read and clears the flag
   * - block_sender: blocks the author (platform + handle), marks all of their
   *   items from this user's inbox as read, and clears their flags.
   */
  async moderateInboxItem(
    itemId: string,
    userId: string,
    action: ModerationAction["action"]
  ): Promise<ModerationActionResult> {
    const item = await this.inboxRepo.getItem(itemId);
    if (!item || item.userId !== userId) {
      throw new Error("Inbox item not found");
    }

    if (action === "approve") {
      await this.inboxRepo.setFlagged(itemId, false);
      return { itemId, action, affectedItems: 1, blockedSender: null };
    }

    if (action === "hide") {
      await this.inboxRepo.updateStatus(itemId, "read");
      await this.inboxRepo.setFlagged(itemId, false);
      return { itemId, action, affectedItems: 1, blockedSender: null };
    }

    // block_sender
    const blockedSender = await this.blockedSenderRepo.block({
      userId,
      platform: item.platform,
      handle: item.authorHandle,
    });
    const affectedItems = await this.inboxRepo.markAllFromAuthorRead(
      userId,
      item.platform,
      item.authorHandle
    );

    return { itemId, action, affectedItems, blockedSender };
  }
}
