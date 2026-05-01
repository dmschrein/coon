import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ZodError } from "zod";
import { getContainer } from "@/lib/core/di/container";
import {
  memberListQuerySchema,
  createMemberSchema,
} from "@/lib/validations/member";

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
    const queryResult = memberListQuerySchema.safeParse({
      status: url.searchParams.get("status") ?? undefined,
      platform: url.searchParams.get("platform") ?? undefined,
      minEngagement: url.searchParams.get("minEngagement") ?? undefined,
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

    const { platformMemberRepo } = getContainer();
    const { items, total } = await platformMemberRepo.listMembers(userId, {
      status: queryResult.data.status,
      platform: queryResult.data.platform,
      minEngagement: queryResult.data.minEngagement,
      page: queryResult.data.page,
      limit: queryResult.data.limit,
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
    console.error("Error fetching members:", error);
    return NextResponse.json(
      {
        data: null,
        error: {
          message: "Failed to fetch members",
          code: "INTERNAL_ERROR",
        },
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
    const parsed = createMemberSchema.parse(body);

    const { platformMemberRepo } = getContainer();
    const member = await platformMemberRepo.createMember({
      userId,
      platform: parsed.platform,
      platformUserId: parsed.platformUserId,
      username: parsed.username,
      displayName: parsed.displayName,
    });

    if (!member) {
      return NextResponse.json(
        {
          data: null,
          error: {
            message: "Member already exists for this platform handle",
            code: "CONFLICT",
          },
        },
        { status: 409 }
      );
    }

    return NextResponse.json({ data: member, error: null }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          data: null,
          error: {
            message: error.issues[0].message,
            code: "VALIDATION_ERROR",
          },
        },
        { status: 400 }
      );
    }

    console.error("Error creating member:", error);
    return NextResponse.json(
      {
        data: null,
        error: { message: "Failed to create member", code: "INTERNAL_ERROR" },
      },
      { status: 500 }
    );
  }
}
