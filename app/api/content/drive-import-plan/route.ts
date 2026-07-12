import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { previewDriveImportPlan } from "@/lib/google/drive-import-plan";

/**
 * Admin-only dry-run import plan.
 * SELECT-only DB reads + Drive discovery. Never writes.
 */
export async function GET() {
  const { error } = await requireAdminSession();
  if (error) return error;

  const preview = await previewDriveImportPlan();

  if (!preview.ok) {
    return NextResponse.json(preview, {
      status: preview.error?.code === "drive_not_configured" ? 400 : 502,
    });
  }

  return NextResponse.json(preview);
}
