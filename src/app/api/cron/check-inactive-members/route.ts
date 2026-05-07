/**
 * Cron: scan for members whose last activity was 14+ days ago and fire the
 * `member_inactive_14d` workflow event for each. Dedupes via
 * platform_members.last_inactive_fired_at — we never re-fire for the same
 * idle stretch, but the trigger naturally re-arms once a member becomes
 * active again.
 *
 * GET /api/cron/check-inactive-members
 * Secured via CRON_SECRET header. Designed for Vercel Cron.
 */

import { NextResponse } from "next/server";
import { getContainer } from "@/lib/core/di/container";

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        {
          data: null,
          error: { message: "Unauthorized", code: "UNAUTHORIZED" },
        },
        { status: 401 }
      );
    }
  }

  try {
    const { workflowService, platformMemberRepo } = getContainer();
    const threshold = new Date(Date.now() - FOURTEEN_DAYS_MS);
    const inactiveMembers =
      await platformMemberRepo.findInactiveMembers(threshold);

    const results: { memberId: string; status: string }[] = [];

    for (const member of inactiveMembers) {
      try {
        await workflowService.evaluateTriggersForEvent(
          member.userId,
          "member_inactive_14d",
          {
            member,
            communityName: "your community",
            triggerReason: "member_inactive_14d",
            campaignId: null,
            contentId: null,
          }
        );
        await platformMemberRepo.markInactiveFired(member.id, new Date());
        results.push({ memberId: member.id, status: "fired" });
      } catch (err) {
        console.error(`Inactive member workflow failed for ${member.id}:`, err);
        results.push({ memberId: member.id, status: "failed" });
      }
    }

    return NextResponse.json({
      data: { processed: results.length, results },
      error: null,
    });
  } catch (error) {
    console.error("Inactive member cron error:", error);
    return NextResponse.json(
      {
        data: null,
        error: {
          message: "Inactive member cron failed",
          code: "INTERNAL_ERROR",
        },
      },
      { status: 500 }
    );
  }
}
