import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { sanitizeGoogleReturnTo } from "@/lib/google/gmail-auth";

export const dynamic = "force-dynamic";

/** Legacy Gmail start path → unified Google Workspace reconnect. */
export async function GET(request: Request) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const requestUrl = new URL(request.url);
  const returnTo = sanitizeGoogleReturnTo(
    requestUrl.searchParams.get("returnTo"),
  );
  const target = new URL("/api/admin/google/oauth/start", requestUrl.origin);
  target.searchParams.set("returnTo", returnTo);
  return NextResponse.redirect(target);
}
