import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/require-admin";
import {
  GOOGLE_OAUTH_STATE_COOKIE,
  GOOGLE_OAUTH_STATE_MAX_AGE_SEC,
  buildGoogleWorkspaceReconnectAuthUrl,
  createGoogleWorkspaceOAuthState,
  resolveGoogleOAuthRedirectUri,
  sanitizeGoogleReturnTo,
} from "@/lib/google/gmail-auth";
import { isGoogleOAuthClientConfigured } from "@/lib/google/workspace-credentials";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { error } = await requireAdminSession();
  if (error) return error;

  if (!isGoogleOAuthClientConfigured()) {
    return NextResponse.json(
      {
        error: "Google OAuth client is not configured.",
        code: "google_not_configured",
      },
      { status: 503 },
    );
  }

  const requestUrl = new URL(request.url);
  const returnTo = sanitizeGoogleReturnTo(
    requestUrl.searchParams.get("returnTo"),
  );
  const redirectUri = resolveGoogleOAuthRedirectUri(request.url);

  try {
    const { token } = await createGoogleWorkspaceOAuthState(returnTo);
    const authUrl = buildGoogleWorkspaceReconnectAuthUrl({
      redirectUri,
      state: token,
    });

    if (!authUrl) {
      return NextResponse.json(
        {
          error: "Google OAuth client is not configured.",
          code: "google_not_configured",
        },
        { status: 503 },
      );
    }

    const response = NextResponse.redirect(authUrl);
    response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: GOOGLE_OAUTH_STATE_MAX_AGE_SEC,
    });
    return response;
  } catch {
    console.error("[google-oauth/start] state_failed");
    return NextResponse.json(
      {
        error: "Could not start Google Workspace reconnect.",
        code: "google_oauth_start_failed",
      },
      { status: 500 },
    );
  }
}
