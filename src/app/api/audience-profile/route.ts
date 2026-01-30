import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { audienceProfiles } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { data: null, error: { message: "Unauthorized", code: "UNAUTHORIZED" } },
        { status: 401 }
      );
    }

    const [profile] = await db
      .select()
      .from(audienceProfiles)
      .where(
        and(
          eq(audienceProfiles.userId, userId),
          eq(audienceProfiles.isActive, true)
        )
      )
      .orderBy(desc(audienceProfiles.generatedAt))
      .limit(1);

    return NextResponse.json({ data: profile || null, error: null });
  } catch (error) {
    console.error("Error fetching audience profile:", error);
    return NextResponse.json(
      {
        data: null,
        error: { message: "Failed to fetch audience profile", code: "INTERNAL_ERROR" },
      },
      { status: 500 }
    );
  }
}
