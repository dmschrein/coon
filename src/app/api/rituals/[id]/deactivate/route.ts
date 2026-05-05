import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getContainer } from "@/lib/core/di/container";
import { ServiceError } from "@/lib/core/services";

export async function POST(
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

    const { id } = await params;
    const { ritualService } = getContainer();
    await ritualService.deactivate(id, userId);

    return NextResponse.json({
      data: { deactivated: true },
      error: null,
    });
  } catch (error) {
    if (error instanceof ServiceError) {
      const status = error.code === "NOT_FOUND" ? 404 : 400;
      return NextResponse.json(
        { data: null, error: { message: error.message, code: error.code } },
        { status }
      );
    }

    console.error("Error deactivating ritual:", error);
    return NextResponse.json(
      {
        data: null,
        error: {
          message: "Failed to deactivate ritual",
          code: "INTERNAL_ERROR",
        },
      },
      { status: 500 }
    );
  }
}
