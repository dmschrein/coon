import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getContainer } from "@/lib/core/di/container";
import { notificationListQuerySchema } from "@/lib/validations/notification";

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
    const queryResult = notificationListQuerySchema.safeParse({
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

    const { notificationRepo } = getContainer();
    const [items, unreadCount] = await Promise.all([
      notificationRepo.listNotifications(userId, queryResult.data.limit),
      notificationRepo.countUnread(userId),
    ]);

    return NextResponse.json({
      data: { items, unreadCount },
      error: null,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      {
        data: null,
        error: {
          message: "Failed to fetch notifications",
          code: "INTERNAL_ERROR",
        },
      },
      { status: 500 }
    );
  }
}
