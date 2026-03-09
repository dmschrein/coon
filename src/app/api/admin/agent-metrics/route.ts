/**
 * Agent Metrics API - Returns agent execution statistics.
 *
 * GET /api/admin/agent-metrics
 * Query params:
 *   - agentType: Filter by specific agent type
 *   - since: ISO date string for time window (default: last 7 days)
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getContainer } from "@/lib/core/di/container";
import type { AgentType } from "@/types";

const VALID_AGENT_TYPES = new Set([
  "audience_analysis",
  "content_generation",
  "campaign_strategy",
  "campaign_calendar",
  "campaign_content",
]);

export async function GET(req: Request) {
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

    const url = new URL(req.url);
    const agentType = url.searchParams.get("agentType");
    const sinceParam = url.searchParams.get("since");

    // Validate agentType if provided
    if (agentType && !VALID_AGENT_TYPES.has(agentType)) {
      return NextResponse.json(
        {
          data: null,
          error: {
            message: `Invalid agent type: ${agentType}`,
            code: "INVALID_PARAM",
          },
        },
        { status: 400 }
      );
    }

    // Parse since date (default to 7 days ago)
    let since: Date;
    if (sinceParam) {
      since = new Date(sinceParam);
      if (isNaN(since.getTime())) {
        return NextResponse.json(
          {
            data: null,
            error: {
              message: "Invalid date format for 'since' parameter",
              code: "INVALID_PARAM",
            },
          },
          { status: 400 }
        );
      }
    } else {
      since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }

    const container = getContainer();
    const metrics = await container.agentRunRepo.getMetrics({
      agentType: agentType as AgentType | undefined,
      since,
    });

    return NextResponse.json({ data: metrics, error: null });
  } catch (error) {
    console.error("Error fetching agent metrics:", error);
    return NextResponse.json(
      {
        data: null,
        error: {
          message: "Failed to fetch agent metrics",
          code: "INTERNAL_ERROR",
        },
      },
      { status: 500 }
    );
  }
}
