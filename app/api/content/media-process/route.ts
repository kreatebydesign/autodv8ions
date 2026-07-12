import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/require-admin";
import {
  listMediaProcessingQueue,
  runGalleryMediaProcessing,
} from "@/lib/live-portfolio/media-process";

/**
 * Admin-only media processing status (Phase 2A).
 * Read-only. Never publishes.
 */
export async function GET() {
  const { error } = await requireAdminSession();
  if (error) return error;

  try {
    const queue = await listMediaProcessingQueue({ limit: 100 });
    return NextResponse.json({
      ok: true,
      published: false,
      publicUrlsCreated: false,
      ...queue,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "media_queue_failed",
          message:
            err instanceof Error ? err.message : "Failed to load media queue.",
        },
      },
      { status: 502 },
    );
  }
}

/**
 * Admin-only media ingestion runner.
 * POST only. Requires { confirmMediaProcess: true }.
 * Private Blob storage. No public URLs. No publishing.
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
        published: false,
        error: {
          code: "invalid_json",
          message: "Request body must be valid JSON.",
        },
      },
      { status: 400 },
    );
  }

  const result = await runGalleryMediaProcessing(
    (body && typeof body === "object" ? body : {}) as {
      confirmMediaProcess?: unknown;
      maxItems?: unknown;
      mediaIds?: unknown;
      retryFailed?: unknown;
    },
  );

  if (!result.ok) {
    const status =
      result.error?.code === "confirmation_required" ||
      result.error?.code === "invalid_json"
        ? 400
        : 502;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json(result);
}
