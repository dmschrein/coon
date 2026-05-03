import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getContainer } from "@/lib/core/di/container";
import { inboxListQuerySchema } from "@/lib/validations/inbox";

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
    const queryResult = inboxListQuerySchema.safeParse({
      status: url.searchParams.get("status") ?? undefined,
      platform: url.searchParams.get("platform") ?? undefined,
      campaignId: url.searchParams.get("campaignId") ?? undefined,
      flagged: url.searchParams.get("flagged") ?? undefined,
      page: url.searchParams.get("page") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    });

    if (!queryResult.success) {
      return NextResponse.json(
        {
          data: null,
          error: {
            message: queryResult.error.issues[0].message,
            code: "VALIDATION_ERROR",
          },
        },
        { status: 400 }
      );
    }

    const { inboxRepo } = getContainer();
    const { items, total } = await inboxRepo.listItems({
      userId,
      ...queryResult.data,
    });

    return NextResponse.json({
      data: {
        items,
        total,
        page: queryResult.data.page,
        limit: queryResult.data.limit,
      },
      error: null,
    });
  } catch (error) {
    console.error("Error fetching inbox items:", error);
    return NextResponse.json(
      {
        data: null,
        error: {
          message: "Failed to fetch inbox items",
          code: "INTERNAL_ERROR",
        },
      },
      { status: 500 }
    );
  }
}
