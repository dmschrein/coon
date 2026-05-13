import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ZodError } from "zod";
import { getContainer } from "@/lib/core/di/container";
import {
  sponsorCreateSchema,
  sponsorListQuerySchema,
} from "@/lib/validations/sponsor";

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
    const queryResult = sponsorListQuerySchema.safeParse({
      status: url.searchParams.get("status") ?? undefined,
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

    const { sponsorRepo } = getContainer();
    const sponsors = await sponsorRepo.listSponsors(userId, {
      status: queryResult.data.status,
    });

    return NextResponse.json({ data: sponsors, error: null });
  } catch (error) {
    console.error("Error fetching sponsors:", error);
    return NextResponse.json(
      {
        data: null,
        error: { message: "Failed to fetch sponsors", code: "INTERNAL_ERROR" },
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
    const parsed = sponsorCreateSchema.parse(body);

    const { sponsorRepo } = getContainer();
    const sponsor = await sponsorRepo.createSponsor(userId, parsed);

    return NextResponse.json({ data: sponsor, error: null }, { status: 201 });
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

    console.error("Error creating sponsor:", error);
    return NextResponse.json(
      {
        data: null,
        error: { message: "Failed to create sponsor", code: "INTERNAL_ERROR" },
      },
      { status: 500 }
    );
  }
}
