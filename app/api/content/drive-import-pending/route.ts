import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { runPendingDriveImport } from "@/lib/google/drive-import-pending";
import { trimReviewQueue } from "@/lib/portfolio-engine/rotation";

/**
 * Admin-only controlled pending import.
 * After successful writes, trims Review Queue to portfolio engine limits.
 */
export async function POST(request: Request) {
  const { error } = await requireAdminSession();
  if (error) return error;

  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        writesPerformed: false,
        error: {
          code: "invalid_json",
          message: "Request body must be valid JSON.",
        },
      },
      { status: 400 },
    );
  }

  const result = await runPendingDriveImport(
    (body && typeof body === "object" ? body : {}) as {
      confirmPendingImport?: unknown;
      maxMonths?: unknown;
      maxItems?: unknown;
      maxMedia?: unknown;
    },
  );

  if (!result.ok) {
    const status =
      result.error?.code === "confirmation_required" ||
      result.error?.code === "invalid_json"
        ? 400
        : result.error?.code === "schema_missing" ||
            result.error?.code === "supabase_not_configured" ||
            result.error?.code === "drive_not_configured"
          ? 400
          : 502;
    return NextResponse.json(result, { status });
  }

  const trim = await trimReviewQueue();

  return NextResponse.json({
    ...result,
    reviewQueueTrim: trim.ok
      ? {
          archivedIds: trim.archivedIds,
          queueSize: trim.queueSize,
        }
      : { error: trim.error },
  });
}

/** Explicitly reject GET mutations. */
export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      writesPerformed: false,
      error: {
        code: "method_not_allowed",
        message:
          "Pending import writes require POST with { confirmPendingImport: true }. GET is read-only and does not mutate.",
      },
    },
    { status: 405 },
  );
}
