import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getContainer } from "@/lib/core/di/container";
import { draftReply } from "@/lib/agents/reply-drafter";
import { createOrchestration } from "@/lib/orchestration";

export const maxDuration = 120;

const { queue, circuitBreaker } = createOrchestration();

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        {
          data: null,
          error: { message: "Unauthorized", code: "UNAUTHORIZED" },
        },
        { status: 401 }
      );
    }

    const { id } = await params;
    const { inboxRepo } = getContainer();
    const item = await inboxRepo.getItem(id);

    if (!item || item.userId !== userId) {
      return NextResponse.json(
        {
          data: null,
          error: { message: "Inbox item not found", code: "NOT_FOUND" },
        },
        { status: 404 }
      );
    }

    const { result, modelUsed, tokensUsed } = await queue.enqueue({
      id: `reply-drafter:${id}`,
      agentType: "reply_drafter",
      priority: 1,
      execute: () =>
        circuitBreaker.execute(() =>
          draftReply({
            originalPost: item.contentId ? item.messageText : "",
            incomingMessage: item.messageText,
            platform: item.platform,
            authorHandle: item.authorHandle,
          })
        ),
    });

    return NextResponse.json({
      data: { drafts: result.drafts, modelUsed, tokensUsed },
      error: null,
    });
  } catch (error) {
    console.error("Error drafting reply:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      {
        data: null,
        error: { message, code: "AGENT_FAILED" },
      },
      { status: 500 }
    );
  }
}
