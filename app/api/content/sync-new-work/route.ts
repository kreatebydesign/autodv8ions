import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { runSyncNewWork } from "@/lib/content/sync-new-work";

/**
 * Sync New Work: current-month Drive import + media processing (no publish).
 */
export async function POST() {
  const { error } = await requireAdminSession();
  if (error) return error;

  try {
    const result = await runSyncNewWork();
    const status = result.ok ? 200 : result.error?.code === "drive_not_configured" ? 400 : 502;
    return NextResponse.json(result, { status });
  } catch (err) {
    console.error("[content/sync-new-work]", err);
    return NextResponse.json(
      {
        ok: false,
        message: err instanceof Error ? err.message : "Sync failed.",
        error: {
          code: "sync_failed",
          message: err instanceof Error ? err.message : "Sync failed.",
        },
      },
      { status: 500 },
    );
  }
}
