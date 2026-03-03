import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import {
  campaigns,
  campaignContent,
  campaignCalendarEntries,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { data: null, error: { message: "Unauthorized", code: "UNAUTHORIZED" } },
        { status: 401 }
      );
    }

    const { id: campaignId } = await params;

    // Fetch campaign
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.userId, userId)))
      .limit(1);

    if (!campaign) {
      return NextResponse.json(
        {
          data: null,
          error: { message: "Campaign not found", code: "NOT_FOUND" },
        },
        { status: 404 }
      );
    }

    // Fetch campaign content
    const content = await db
      .select()
      .from(campaignContent)
      .where(eq(campaignContent.campaignId, campaignId));

    // Fetch calendar entries
    const calendarEntries = await db
      .select()
      .from(campaignCalendarEntries)
      .where(eq(campaignCalendarEntries.campaignId, campaignId));

    return NextResponse.json({
      data: {
        campaign,
        content,
        calendarEntries,
      },
      error: null,
    });
  } catch (error) {
    console.error("Error fetching campaign:", error);
    return NextResponse.json(
      {
        data: null,
        error: { message: "Failed to fetch campaign", code: "INTERNAL_ERROR" },
      },
      { status: 500 }
    );
  }
}
