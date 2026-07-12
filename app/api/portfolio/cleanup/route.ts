import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { cleanupExpiredArchivedBlobs } from "@/lib/portfolio-engine/cleanup";

/**
 * Admin Blob retention cleanup for archived showcase items.
 * Deletes private Blob objects only — never Drive originals or gallery rows.
 */
export async function POST(request: Request) {
  const { error } = await requireAdminSession();
  if (error) return error;

  let body: { dryRun?: boolean; limit?: number } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const result = await cleanupExpiredArchivedBlobs({
    // Fail closed: require explicit dryRun:false to delete anything.
    dryRun: body.dryRun !== false ? true : false,
    limit: typeof body.limit === "number" ? body.limit : 40,
  });

  return NextResponse.json(result);
}
