import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ZodError } from "zod";
import { getContainer } from "@/lib/core/di/container";
import { createWorkflowSchema } from "@/lib/validations/workflow";

export async function GET() {
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

    const { workflowService } = getContainer();
    const items = await workflowService.listForUser(userId);

    return NextResponse.json({ data: { items }, error: null });
  } catch (error) {
    console.error("Error fetching workflows:", error);
    return NextResponse.json(
      {
        data: null,
        error: { message: "Failed to fetch workflows", code: "INTERNAL_ERROR" },
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
    const parsed = createWorkflowSchema.parse(body);

    const { workflowService } = getContainer();
    const trigger = await workflowService.create(userId, {
      name: parsed.name,
      eventType: parsed.eventType,
      conditions: parsed.conditions,
      actions: parsed.actions,
      isActive: parsed.isActive,
    });

    return NextResponse.json({ data: trigger, error: null }, { status: 201 });
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

    console.error("Error creating workflow:", error);
    return NextResponse.json(
      {
        data: null,
        error: { message: "Failed to create workflow", code: "INTERNAL_ERROR" },
      },
      { status: 500 }
    );
  }
}
