import { google } from "googleapis";
import { SITE_EMAIL, SITE_ORIGIN } from "@/lib/site/canonical";
import { normalizeEmailAddress } from "@/lib/google/gmail-message";
import { isGoogleOAuthClientConfigured } from "@/lib/google/workspace-credentials";

export const GMAIL_OAUTH_SCOPE = "https://www.googleapis.com/auth/gmail.modify";
export const CALENDAR_OAUTH_SCOPE = "https://www.googleapis.com/auth/calendar";

/** Scopes required for the existing Gmail + Calendar dashboard features. */
export const GOOGLE_WORKSPACE_OAUTH_SCOPES = [
  GMAIL_OAUTH_SCOPE,
  CALENDAR_OAUTH_SCOPE,
] as const;

export const GOOGLE_OAUTH_CALLBACK_PATH = "/api/auth/google/callback";
export const GOOGLE_OAUTH_STATE_COOKIE = "dv8_google_oauth_state";
export const GOOGLE_OAUTH_STATE_MAX_AGE_SEC = 60 * 10;

/** @deprecated Use GOOGLE_OAUTH_CALLBACK_PATH */
export const GMAIL_OAUTH_CALLBACK_PATH = GOOGLE_OAUTH_CALLBACK_PATH;
/** @deprecated Use GOOGLE_OAUTH_STATE_COOKIE */
export const GMAIL_OAUTH_STATE_COOKIE = GOOGLE_OAUTH_STATE_COOKIE;
/** @deprecated Use GOOGLE_OAUTH_STATE_MAX_AGE_SEC */
export const GMAIL_OAUTH_STATE_MAX_AGE_SEC = GOOGLE_OAUTH_STATE_MAX_AGE_SEC;

export type GoogleWorkspaceOAuthStatePayload = {
  purpose: "google_workspace_reconnect";
  nonce: string;
  returnTo: string;
  exp: number;
};

/** @deprecated Use GoogleWorkspaceOAuthStatePayload */
export type GmailOAuthStatePayload = GoogleWorkspaceOAuthStatePayload;

function getOAuthClientCredentials() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

export function getRequiredWorkspaceMailbox(): string {
  const configured = process.env.GOOGLE_GMAIL_USER?.trim();
  if (configured?.includes("@")) return normalizeEmailAddress(configured);
  return normalizeEmailAddress(SITE_EMAIL);
}

/** @deprecated Use getRequiredWorkspaceMailbox */
export function getRequiredGmailMailbox(): string {
  return getRequiredWorkspaceMailbox();
}

export function isAllowedGoogleReturnTo(returnTo: string): boolean {
  if (!returnTo.startsWith("/")) return false;
  if (returnTo.startsWith("//")) return false;
  if (!returnTo.startsWith("/admin")) return false;
  if (returnTo.includes("\\") || returnTo.includes("\n") || returnTo.includes("\r")) {
    return false;
  }
  return true;
}

/** @deprecated Use isAllowedGoogleReturnTo */
export function isAllowedGmailReturnTo(returnTo: string): boolean {
  return isAllowedGoogleReturnTo(returnTo);
}

export function sanitizeGoogleReturnTo(
  returnTo: string | null | undefined,
  fallback = "/admin/jobs",
): string {
  const value = String(returnTo || "").trim();
  if (isAllowedGoogleReturnTo(value)) return value;
  return fallback;
}

/** @deprecated Use sanitizeGoogleReturnTo */
export function sanitizeGmailReturnTo(
  returnTo: string | null | undefined,
  fallback = "/admin/jobs",
): string {
  return sanitizeGoogleReturnTo(returnTo, fallback);
}

export function resolveGoogleOAuthRedirectUri(requestUrl: string): string {
  try {
    const url = new URL(requestUrl);
    const host = url.host.toLowerCase();
    if (
      host.startsWith("localhost:") ||
      host.startsWith("127.0.0.1:") ||
      host === "localhost" ||
      host === "127.0.0.1"
    ) {
      return `${url.protocol}//${url.host}${GOOGLE_OAUTH_CALLBACK_PATH}`;
    }
  } catch {
    // fall through to production origin
  }
  return `${SITE_ORIGIN}${GOOGLE_OAUTH_CALLBACK_PATH}`;
}

/** @deprecated Use resolveGoogleOAuthRedirectUri */
export function resolveGmailOAuthRedirectUri(requestUrl: string): string {
  return resolveGoogleOAuthRedirectUri(requestUrl);
}

export function createGoogleOAuth2Client(redirectUri: string) {
  const creds = getOAuthClientCredentials();
  if (!creds) return null;
  return new google.auth.OAuth2(creds.clientId, creds.clientSecret, redirectUri);
}

/** @deprecated Use createGoogleOAuth2Client */
export function createGmailOAuth2Client(redirectUri: string) {
  return createGoogleOAuth2Client(redirectUri);
}

export function buildGoogleWorkspaceReconnectAuthUrl(params: {
  redirectUri: string;
  state: string;
}): string | null {
  if (!isGoogleOAuthClientConfigured()) return null;
  const client = createGoogleOAuth2Client(params.redirectUri);
  if (!client) return null;

  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: false,
    scope: [...GOOGLE_WORKSPACE_OAUTH_SCOPES],
    state: params.state,
    login_hint: getRequiredWorkspaceMailbox(),
  });
}

/** @deprecated Use buildGoogleWorkspaceReconnectAuthUrl */
export function buildGmailReconnectAuthUrl(params: {
  redirectUri: string;
  state: string;
}): string | null {
  return buildGoogleWorkspaceReconnectAuthUrl(params);
}

function toBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  return new Uint8Array(Buffer.from(padded, "base64"));
}

async function signPayload(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );
  return toBase64Url(new Uint8Array(signature));
}

export async function createGoogleWorkspaceOAuthState(
  returnTo: string,
): Promise<{ token: string; payload: GoogleWorkspaceOAuthStatePayload }> {
  const secret = process.env.ADMIN_SESSION_SECRET?.trim();
  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET is not configured");
  }

  const payload: GoogleWorkspaceOAuthStatePayload = {
    purpose: "google_workspace_reconnect",
    nonce: toBase64Url(crypto.getRandomValues(new Uint8Array(16))),
    returnTo: sanitizeGoogleReturnTo(returnTo),
    exp: Date.now() + GOOGLE_OAUTH_STATE_MAX_AGE_SEC * 1000,
  };

  const payloadB64 = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await signPayload(payloadB64, secret);
  return { token: `${payloadB64}.${signature}`, payload };
}

/** @deprecated Use createGoogleWorkspaceOAuthState */
export async function createGmailOAuthState(returnTo: string) {
  return createGoogleWorkspaceOAuthState(returnTo);
}

export async function verifyGoogleWorkspaceOAuthState(
  token: string | undefined | null,
): Promise<GoogleWorkspaceOAuthStatePayload | null> {
  if (!token) return null;
  const secret = process.env.ADMIN_SESSION_SECRET?.trim();
  if (!secret) return null;

  const [payloadB64, signature] = token.split(".");
  if (!payloadB64 || !signature) return null;

  const expected = await signPayload(payloadB64, secret);
  if (signature !== expected) return null;

  try {
    const json = new TextDecoder().decode(fromBase64Url(payloadB64));
    const payload = JSON.parse(json) as GoogleWorkspaceOAuthStatePayload & {
      purpose?: string;
    };
    // Accept legacy gmail_reconnect purpose for in-flight cookies.
    if (
      payload.purpose !== "google_workspace_reconnect" &&
      payload.purpose !== "gmail_reconnect"
    ) {
      return null;
    }
    if (!payload.nonce || payload.exp < Date.now()) return null;
    if (!isAllowedGoogleReturnTo(payload.returnTo)) return null;
    return {
      ...payload,
      purpose: "google_workspace_reconnect",
    };
  } catch {
    return null;
  }
}

/** @deprecated Use verifyGoogleWorkspaceOAuthState */
export async function verifyGmailOAuthState(token: string | undefined | null) {
  return verifyGoogleWorkspaceOAuthState(token);
}

export function buildGoogleWorkspaceReconnectStartPath(returnTo: string): string {
  const safe = sanitizeGoogleReturnTo(returnTo);
  const params = new URLSearchParams({ returnTo: safe });
  return `/api/admin/google/oauth/start?${params.toString()}`;
}

/** @deprecated Use buildGoogleWorkspaceReconnectStartPath */
export function buildGmailReconnectStartPath(returnTo: string): string {
  return buildGoogleWorkspaceReconnectStartPath(returnTo);
}

export function appendGoogleReconnectQuery(
  returnTo: string,
  result: "connected" | "error",
  code?: string,
): string {
  const url = new URL(sanitizeGoogleReturnTo(returnTo), SITE_ORIGIN);
  url.searchParams.set("google", result);
  if (code) url.searchParams.set("googleCode", code);
  // Keep legacy gmail query keys for older UI that still reads them.
  url.searchParams.set("gmail", result);
  if (code) url.searchParams.set("gmailCode", code);
  return `${url.pathname}${url.search}${url.hash}`;
}

/** @deprecated Use appendGoogleReconnectQuery */
export function appendGmailReconnectQuery(
  returnTo: string,
  result: "connected" | "error",
  code?: string,
): string {
  return appendGoogleReconnectQuery(returnTo, result, code);
}

export function workspaceScopesAreSufficient(scopes: string): boolean {
  const normalized = scopes.toLowerCase();
  return (
    normalized.includes("gmail.modify") &&
    (normalized.includes("/auth/calendar") ||
      normalized.includes("https://www.googleapis.com/auth/calendar"))
  );
}
