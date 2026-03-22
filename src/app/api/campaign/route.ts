import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getContainer } from "@/lib/core/di/container";
import { ServiceError } from "@/lib/core/services";
import type { CampaignPlatform } from "@/types";
import { z } from "zod";

export const maxDuration = 120;

const createCampaignSchema = z.object({
  selectedPlatforms: z.array(z.string()).min(1),
});

export async function GET() {
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

    const { campaignService } = getContainer();
    const campaigns = await campaignService.listCampaigns(userId);

    return NextResponse.json({ data: campaigns, error: null });
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    return NextResponse.json(
      {
        data: null,
        error: { message: "Failed to fetch campaigns", code: "INTERNAL_ERROR" },
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
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

    const body = await req.json();
    const { selectedPlatforms } = createCampaignSchema.parse(body);

    const { campaignService } = getContainer();
    const campaign = await campaignService.createCampaign(
      userId,
      selectedPlatforms as CampaignPlatform[]
    );

    return NextResponse.json({ data: campaign, error: null });
  } catch (error) {
    if (error instanceof ServiceError) {
      const status =
        error.code === "NO_PROFILE" || error.code === "NO_QUIZ_RESPONSE"
          ? 400
          : error.code === "AGENT_FAILED"
            ? 500
            : 400;
      return NextResponse.json(
        { data: null, error: { message: error.message, code: error.code } },
        { status }
      );
    }

    console.error("Error creating campaign:", error);
    return NextResponse.json(
      {
        data: null,
        error: { message: "Internal server error", code: "INTERNAL_ERROR" },
      },
      { status: 500 }
    );
  }
}
