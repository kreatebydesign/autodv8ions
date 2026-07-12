import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { checkDriveConnection } from "@/lib/google/drive";

export async function GET() {
  const { error } = await requireAdminSession();
  if (error) return error;

  const result = await checkDriveConnection();

  if (!result.authenticated || result.error) {
    return NextResponse.json(
      {
        configured: result.configured,
        authenticated: result.authenticated,
        authMode: result.authMode,
        rootFolderName: result.rootFolderName,
        immediateFolderCount: result.immediateFolderCount,
        sampleFolderNames: result.sampleFolderNames,
        error: result.error || {
          code: "drive_check_failed",
          message: "Drive connection check failed.",
        },
      },
      { status: result.configured ? 502 : 400 },
    );
  }

  return NextResponse.json({
    configured: true,
    authenticated: true,
    authMode: result.authMode,
    rootFolderName: result.rootFolderName,
    immediateFolderCount: result.immediateFolderCount,
    sampleFolderNames: result.sampleFolderNames,
  });
}
