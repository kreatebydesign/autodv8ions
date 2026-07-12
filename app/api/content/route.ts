import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/require-admin";
import {
  isGoogleDriveConfigured,
  listContentUploadsFromDb,
  listPortfolioItemsFromDb,
  syncDriveContentUploads,
} from "@/lib/google/drive";
import type { PortfolioSyncOptions } from "@/lib/live-portfolio/types";

export async function GET() {
  const { error } = await requireAdminSession();
  if (error) return error;

  const [uploads, items] = await Promise.all([
    listContentUploadsFromDb(),
    listPortfolioItemsFromDb(),
  ]);

  return NextResponse.json({
    connected: isGoogleDriveConfigured(),
    uploads,
    items,
    message: isGoogleDriveConfigured()
      ? "Sync imports Tint Jobs for review only. Nothing is published automatically."
      : "Google Drive is not connected yet.",
  });
}

export async function POST(request: Request) {
  const { error } = await requireAdminSession();
  if (error) return error;

  if (!isGoogleDriveConfigured()) {
    return NextResponse.json(
      { error: "Google Drive is not connected yet." },
      { status: 400 },
    );
  }

  let options: Partial<PortfolioSyncOptions> = {};
  try {
    const body = await request.json();
    if (body && typeof body === "object") {
      options = body as Partial<PortfolioSyncOptions>;
    }
  } catch {
    options = {};
  }

  try {
    const result = await syncDriveContentUploads(options);
    const items = await listPortfolioItemsFromDb();
    return NextResponse.json({
      success: result.success,
      count: result.importedFolders,
      result,
      items,
      message:
        "Sync complete. Imported folders are pending review and were not published.",
    });
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
