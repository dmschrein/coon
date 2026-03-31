import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getContainer } from "@/lib/core/di/container";
import { ServiceError } from "@/lib/core/services";
import { campaignUpdateSchema } from "@/lib/validations/campaign";

export async function GET(
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

    const { id: campaignId } = await params;
    const { campaignService } = getContainer();

    const result = await campaignService.getCampaign(campaignId, userId);

    return NextResponse.json({ data: result, error: null });
  } catch (error) {
    if (error instanceof ServiceError && error.code === "NOT_FOUND") {
      return NextResponse.json(
        { data: null, error: { message: error.message, code: error.code } },
        { status: 404 }
      );
    }

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

export async function PUT(
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

    const { id: campaignId } = await params;
    const body = await req.json();
    const validated = campaignUpdateSchema.parse(body);

    const { campaignService } = getContainer();
    const campaign = await campaignService.updateCampaign(
      campaignId,
      userId,
      validated
    );

    return NextResponse.json({ data: campaign, error: null });
  } catch (error) {
    if (error instanceof ServiceError && error.code === "NOT_FOUND") {
      return NextResponse.json(
        { data: null, error: { message: error.message, code: error.code } },
        { status: 404 }
      );
    }

    console.error("Error updating campaign:", error);
    return NextResponse.json(
      {
        data: null,
        error: {
          message: "Failed to update campaign",
          code: "INTERNAL_ERROR",
        },
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
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

    const { id: campaignId } = await params;
    const { campaignService } = getContainer();
    await campaignService.deleteCampaign(campaignId, userId);

    return NextResponse.json({ data: { deleted: true }, error: null });
  } catch (error) {
    if (error instanceof ServiceError && error.code === "NOT_FOUND") {
      return NextResponse.json(
        { data: null, error: { message: error.message, code: error.code } },
        { status: 404 }
      );
    }

    console.error("Error deleting campaign:", error);
    return NextResponse.json(
      {
        data: null,
        error: {
          message: "Failed to delete campaign",
          code: "INTERNAL_ERROR",
        },
      },
      { status: 500 }
    );
  }
}
