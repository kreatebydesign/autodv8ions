import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { previewDriveDiscovery } from "@/lib/google/drive-discovery";

/**
 * Admin-only read-only Drive discovery preview.
 * No DB writes, no sync, no downloads, no Blob.
 */
export async function GET() {
  const { error } = await requireAdminSession();
  if (error) return error;

  const preview = await previewDriveDiscovery();

  if (!preview.ok) {
    return NextResponse.json(preview, {
      status: preview.error?.code === "drive_not_configured" ? 400 : 502,
    });
  }

  return NextResponse.json(preview);
}
