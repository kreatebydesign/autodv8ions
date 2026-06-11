import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/require-admin";
import {
  isGoogleDriveConfigured,
  listContentUploadsFromDb,
  syncDriveContentUploads,
} from "@/lib/google/drive";

export async function GET() {
  const { error } = await requireAdminSession();
  if (error) return error;

  const uploads = await listContentUploadsFromDb();

  return NextResponse.json({
    connected: isGoogleDriveConfigured(),
    uploads,
    message: isGoogleDriveConfigured()
      ? null
      : "Google Drive is not connected yet.",
  });
}

export async function POST() {
  const { error } = await requireAdminSession();
  if (error) return error;

  if (!isGoogleDriveConfigured()) {
    return NextResponse.json(
      { error: "Google Drive is not connected yet." },
      { status: 400 },
    );
  }

  try {
    const uploads = await syncDriveContentUploads();
    return NextResponse.json({ success: true, count: uploads.length, uploads });
  } catch (driveError) {
    console.error("[google/drive]", driveError);
    return NextResponse.json(
      {
        error:
          driveError instanceof Error
            ? driveError.message
            : "Drive sync failed.",
      },
      { status: 500 },
    );
  }
}
