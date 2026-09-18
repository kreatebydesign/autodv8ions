import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireAdminSession } from "@/lib/auth/require-admin";
import {
  GOOGLE_OAUTH_CALLBACK_PATH,
  GOOGLE_OAUTH_STATE_COOKIE,
  GOOGLE_WORKSPACE_OAUTH_SCOPES,
  appendGoogleReconnectQuery,
  createGoogleOAuth2Client,
  getRequiredWorkspaceMailbox,
  resolveGoogleOAuthRedirectUri,
  verifyGoogleWorkspaceOAuthState,
  workspaceScopesAreSufficient,
} from "@/lib/google/gmail-auth";
import { saveWorkspaceCredential } from "@/lib/google/workspace-credentials";
import { normalizeEmailAddress } from "@/lib/google/gmail-message";
import { google } from "googleapis";

export const dynamic = "force-dynamic";

function clearStateCookie(response: NextResponse) {
  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  // Clear legacy cookie name if present.
  response.cookies.set("dv8_gmail_oauth_state", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function GET(request: Request) {
  const { error } = await requireAdminSession();
  const requestUrl = new URL(request.url);
  const origin = `${requestUrl.protocol}//${requestUrl.host}`;

  const cookieStore = await cookies();
  const stateCookie =
    cookieStore.get(GOOGLE_OAUTH_STATE_COOKIE)?.value ||
    cookieStore.get("dv8_gmail_oauth_state")?.value;
  const stateParam = requestUrl.searchParams.get("state");
  const code = requestUrl.searchParams.get("code");
  const oauthError = requestUrl.searchParams.get("error");

  const statePayload = await verifyGoogleWorkspaceOAuthState(stateCookie);
  const returnTo = statePayload?.returnTo || "/admin/jobs";

  const fail = (failCode: string) => {
    const target = appendGoogleReconnectQuery(returnTo, "error", failCode);
    const response = NextResponse.redirect(new URL(target, origin));
    clearStateCookie(response);
    return response;
  };

  if (error) {
    const login = new URL("/admin/login", origin);
    login.searchParams.set(
      "next",
      `${GOOGLE_OAUTH_CALLBACK_PATH}${requestUrl.search}`,
    );
    return NextResponse.redirect(login);
  }

  if (!statePayload) {
    return fail("google_oauth_state_invalid");
  }

  if (!stateParam || stateParam !== stateCookie) {
    return fail("google_oauth_state_mismatch");
  }

  if (oauthError) {
    console.error("[google-oauth/callback] provider_denied");
    return fail("google_oauth_denied");
  }

  if (!code) {
    return fail("google_oauth_code_missing");
  }

  const redirectUri = resolveGoogleOAuthRedirectUri(request.url);
  const oauth2Client = createGoogleOAuth2Client(redirectUri);
  if (!oauth2Client) {
    return fail("google_not_configured");
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    if (!tokens.refresh_token) {
      console.error("[google-oauth/callback] refresh_token_missing");
      return fail("google_refresh_token_missing");
    }

    oauth2Client.setCredentials(tokens);
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });
    const { data: profile } = await gmail.users.getProfile({ userId: "me" });
    const mailboxEmail = normalizeEmailAddress(
      String(profile.emailAddress || ""),
    );
    const required = getRequiredWorkspaceMailbox();

    if (!mailboxEmail || mailboxEmail !== required) {
      console.error("[google-oauth/callback] wrong_account");
      return fail("google_wrong_account");
    }

    const scopes =
      typeof tokens.scope === "string" && tokens.scope.trim()
        ? tokens.scope
        : GOOGLE_WORKSPACE_OAUTH_SCOPES.join(" ");

    if (!workspaceScopesAreSufficient(scopes)) {
      console.error("[google-oauth/callback] insufficient_scope");
      return fail("google_insufficient_scope");
    }

    await saveWorkspaceCredential({
      mailboxEmail,
      refreshToken: tokens.refresh_token,
      scopes,
    });

    const target = appendGoogleReconnectQuery(returnTo, "connected");
    const response = NextResponse.redirect(new URL(target, origin));
    clearStateCookie(response);
    return response;
  } catch (err) {
    const message = String((err as { message?: string })?.message || "");
    if (/invalid_grant|invalid_client|unauthorized/i.test(message)) {
      console.error("[google-oauth/callback] token_exchange_auth_failed");
      return fail("google_auth_failed");
    }
    console.error("[google-oauth/callback] token_exchange_failed");
    return fail("google_oauth_callback_failed");
  }
}
