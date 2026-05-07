import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ZodError } from "zod";
import { getContainer } from "@/lib/core/di/container";
import { updateWorkflowSchema } from "@/lib/validations/workflow";

export async function GET(
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
    const { workflowService } = getContainer();
    const trigger = await workflowService.findById(id, userId);

    if (!trigger) {
      return NextResponse.json(
        {
          data: null,
          error: { message: "Workflow not found", code: "NOT_FOUND" },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: trigger, error: null });
  } catch (error) {
    console.error("Error fetching workflow:", error);
    return NextResponse.json(
      {
        data: null,
        error: { message: "Failed to fetch workflow", code: "INTERNAL_ERROR" },
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
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
    const body = await req.json();
    const patch = updateWorkflowSchema.parse(body);

    const { workflowService } = getContainer();
    const updated = await workflowService.update(id, userId, patch);

    if (!updated) {
      return NextResponse.json(
        {
          data: null,
          error: { message: "Workflow not found", code: "NOT_FOUND" },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: updated, error: null });
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

    console.error("Error updating workflow:", error);
    return NextResponse.json(
      {
        data: null,
        error: { message: "Failed to update workflow", code: "INTERNAL_ERROR" },
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    const { workflowService } = getContainer();
    const existing = await workflowService.findById(id, userId);

    if (!existing) {
      return NextResponse.json(
        {
          data: null,
          error: { message: "Workflow not found", code: "NOT_FOUND" },
        },
        { status: 404 }
      );
    }

    await workflowService.delete(id, userId);

    return NextResponse.json({ data: { id }, error: null });
  } catch (error) {
    console.error("Error deleting workflow:", error);
    return NextResponse.json(
      {
        data: null,
        error: { message: "Failed to delete workflow", code: "INTERNAL_ERROR" },
      },
      { status: 500 }
    );
  }
}
