import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ZodError } from "zod";
import { getContainer } from "@/lib/core/di/container";
import {
  prospectListQuerySchema,
  createProspectSchema,
} from "@/lib/validations/prospect";

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
    const queryResult = prospectListQuerySchema.safeParse({
      status: url.searchParams.get("status") ?? undefined,
      platform: url.searchParams.get("platform") ?? undefined,
      source: url.searchParams.get("source") ?? undefined,
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

    const { prospectRepo } = getContainer();
    const { items, total } = await prospectRepo.listProspects(userId, {
      status: queryResult.data.status,
      platform: queryResult.data.platform,
      source: queryResult.data.source,
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
    console.error("Error fetching prospects:", error);
    return NextResponse.json(
      {
        data: null,
        error: {
          message: "Failed to fetch prospects",
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
    const parsed = createProspectSchema.parse(body);

    const { prospectRepo } = getContainer();
    const prospect = await prospectRepo.createProspect({
      userId,
      handle: parsed.handle,
      platform: parsed.platform,
      source: parsed.source,
      notes: parsed.notes,
      tags: parsed.tags,
      convertedFromContentId: parsed.convertedFromContentId,
    });

    if (!prospect) {
      return NextResponse.json(
        {
          data: null,
          error: {
            message: "Prospect already exists for this platform handle",
            code: "CONFLICT",
          },
        },
        { status: 409 }
      );
    }

    return NextResponse.json({ data: prospect, error: null }, { status: 201 });
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

    console.error("Error creating prospect:", error);
    return NextResponse.json(
      {
        data: null,
        error: {
          message: "Failed to create prospect",
          code: "INTERNAL_ERROR",
        },
      },
      { status: 500 }
    );
  }
}
