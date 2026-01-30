import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { contentItems } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  _req: Request,
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

    const { id } = await params;

    const [item] = await db
      .select()
      .from(contentItems)
      .where(and(eq(contentItems.id, id), eq(contentItems.userId, userId)));

    if (!item) {
      return NextResponse.json(
        { data: null, error: { message: "Content not found", code: "NOT_FOUND" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: item, error: null });
  } catch (error) {
    console.error("Error fetching content item:", error);
    return NextResponse.json(
      {
        data: null,
        error: { message: "Internal server error", code: "INTERNAL_ERROR" },
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
        { data: null, error: { message: "Unauthorized", code: "UNAUTHORIZED" } },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await req.json();

    // Only allow updating specific fields
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.title !== undefined) updates.title = body.title;
    if (body.body !== undefined) updates.body = body.body;
    if (body.hashtags !== undefined) updates.hashtags = body.hashtags;
    if (body.cta !== undefined) updates.cta = body.cta;
    if (body.status !== undefined) updates.status = body.status;

    const [updated] = await db
      .update(contentItems)
      .set(updates)
      .where(and(eq(contentItems.id, id), eq(contentItems.userId, userId)))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { data: null, error: { message: "Content not found", code: "NOT_FOUND" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: updated, error: null });
  } catch (error) {
    console.error("Error updating content item:", error);
    return NextResponse.json(
      {
        data: null,
        error: { message: "Internal server error", code: "INTERNAL_ERROR" },
      },
      { status: 500 }
    );
  }
}
