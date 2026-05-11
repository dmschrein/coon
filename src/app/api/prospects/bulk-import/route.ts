import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ZodError } from "zod";
import { getContainer } from "@/lib/core/di/container";
import { bulkImportSchema } from "@/lib/validations/prospect";

function detectPlatform(raw: string): { handle: string; platform: string } {
  if (raw.startsWith("u/")) return { handle: raw, platform: "reddit" };
  if (raw.startsWith("@")) return { handle: raw.slice(1), platform: "twitter" };
  return { handle: raw, platform: "manual" };
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
    const parsed = bulkImportSchema.parse(body);

    // Normalize: trim, derive (handle, platform), drop empties.
    const normalized: Array<{ handle: string; platform: string }> = [];
    for (const raw of parsed.handles) {
      const trimmed = raw.trim();
      if (!trimmed) continue;
      if (parsed.platform) {
        normalized.push({ handle: trimmed, platform: parsed.platform });
      } else {
        normalized.push(detectPlatform(trimmed));
      }
    }

    // Dedupe within batch by (platform, handle).
    const seen = new Map<string, { handle: string; platform: string }>();
    for (const item of normalized) {
      const key = `${item.platform}:${item.handle}`;
      if (!seen.has(key)) seen.set(key, item);
    }
    const dedupedInBatch = normalized.length - seen.size;

    const toInsert = Array.from(seen.values()).map((item) => ({
      userId,
      handle: item.handle,
      platform: item.platform,
      source: "import",
    }));

    const { prospectRepo } = getContainer();
    const { inserted, skipped } =
      await prospectRepo.bulkCreateProspects(toInsert);

    return NextResponse.json(
      {
        data: {
          inserted: inserted.length,
          skipped: skipped + dedupedInBatch,
          prospects: inserted,
        },
        error: null,
      },
      { status: 201 }
    );
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

    console.error("Error bulk-importing prospects:", error);
    return NextResponse.json(
      {
        data: null,
        error: {
          message: "Failed to import prospects",
          code: "INTERNAL_ERROR",
        },
      },
      { status: 500 }
    );
  }
}
