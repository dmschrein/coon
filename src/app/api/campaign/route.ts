import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getContainer } from "@/lib/core/di/container";
import { ServiceError } from "@/lib/core/services";
import type { CampaignPlatform } from "@/types";
import { campaignCreatorSchema } from "@/lib/validations/campaign";
import { z } from "zod";

export const maxDuration = 120;

const legacyCreateSchema = z.object({
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
    const { campaignService } = getContainer();

    // Support both new creator flow and legacy flow
    const creatorResult = campaignCreatorSchema.safeParse(body);
    let campaign;

    if (creatorResult.success) {
      const { name, goal, topic, platforms, duration, frequencyConfig } =
        creatorResult.data;
      campaign = await campaignService.createDraftCampaign(userId, {
        name,
        goal: goal as import("@/types").CampaignGoal,
        topic,
        platforms: platforms as CampaignPlatform[],
        duration: duration as import("@/types").CampaignDuration,
        frequencyConfig,
      });
    } else {
      const { selectedPlatforms } = legacyCreateSchema.parse(body);
      campaign = await campaignService.createCampaign(
        userId,
        selectedPlatforms as CampaignPlatform[]
      );
    }

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
