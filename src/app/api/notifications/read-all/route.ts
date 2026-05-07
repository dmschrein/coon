import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getContainer } from "@/lib/core/di/container";

export async function PATCH() {
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

    const { notificationRepo } = getContainer();
    await notificationRepo.markAllRead(userId);

    return NextResponse.json({
      data: { success: true },
      error: null,
    });
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    return NextResponse.json(
      {
        data: null,
        error: {
          message: "Failed to mark notifications as read",
          code: "INTERNAL_ERROR",
        },
      },
      { status: 500 }
    );
  }
}
