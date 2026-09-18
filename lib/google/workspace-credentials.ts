import { decryptSecret, encryptSecret } from "@/lib/google/gmail-crypto";
import { getSupabaseAdmin } from "@/lib/supabase/server";

/** Primary shared credential for Gmail + Calendar reconnect. */
export const WORKSPACE_CREDENTIAL_PROVIDER = "google_workspace" as const;

/** Legacy Gmail-only row (pre-unification); still readable. */
export const LEGACY_GMAIL_CREDENTIAL_PROVIDER = "gmail" as const;

export type StoredWorkspaceCredential = {
  provider: string;
  mailboxEmail: string;
  refreshToken: string;
  scopes: string | null;
  updatedAt: string | null;
};

type CredentialRow = {
  provider: string | null;
  mailbox_email: string | null;
  refresh_token_encrypted: string | null;
  scopes: string | null;
  updated_at: string | null;
};

async function decryptCredentialRow(
  row: CredentialRow,
): Promise<StoredWorkspaceCredential | null> {
  const encrypted = String(row.refresh_token_encrypted || "").trim();
  if (!encrypted) return null;

  try {
    const refreshToken = await decryptSecret(encrypted);
    if (!refreshToken) return null;
    return {
      provider: String(row.provider || "").trim() || WORKSPACE_CREDENTIAL_PROVIDER,
      mailboxEmail: String(row.mailbox_email || "").trim().toLowerCase(),
      refreshToken,
      scopes: row.scopes ? String(row.scopes) : null,
      updatedAt: row.updated_at ? String(row.updated_at) : null,
    };
  } catch {
    console.error("[google-credentials] decrypt_failed");
    return null;
  }
}

/**
 * Runtime refresh token preference for Workspace integrations:
 * 1) Encrypted DB `google_workspace` credential
 * 2) Legacy encrypted DB `gmail` credential
 * 3) Caller-supplied env bootstrap token
 */
export async function loadStoredWorkspaceCredential(): Promise<StoredWorkspaceCredential | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data: workspaceRow, error: workspaceError } = await supabase
    .from("google_oauth_credentials")
    .select("provider, mailbox_email, refresh_token_encrypted, scopes, updated_at")
    .eq("provider", WORKSPACE_CREDENTIAL_PROVIDER)
    .maybeSingle();

  if (!workspaceError && workspaceRow) {
    const decrypted = await decryptCredentialRow(workspaceRow as CredentialRow);
    if (decrypted) return decrypted;
  }

  const { data: legacyRow, error: legacyError } = await supabase
    .from("google_oauth_credentials")
    .select("provider, mailbox_email, refresh_token_encrypted, scopes, updated_at")
    .eq("provider", LEGACY_GMAIL_CREDENTIAL_PROVIDER)
    .maybeSingle();

  if (!legacyError && legacyRow) {
    return decryptCredentialRow(legacyRow as CredentialRow);
  }

  return null;
}

export async function resolveWorkspaceRefreshToken(
  envFallback?: string | null,
): Promise<string | null> {
  const stored = await loadStoredWorkspaceCredential();
  if (stored?.refreshToken) return stored.refreshToken;
  const fromEnv = envFallback?.trim();
  return fromEnv || null;
}

export async function saveWorkspaceCredential(params: {
  mailboxEmail: string;
  refreshToken: string;
  scopes?: string | null;
}): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error("Database not configured.");
  }

  const encrypted = await encryptSecret(params.refreshToken);
  const mailboxEmail = params.mailboxEmail.trim().toLowerCase();

  const { error } = await supabase.from("google_oauth_credentials").upsert(
    {
      provider: WORKSPACE_CREDENTIAL_PROVIDER,
      mailbox_email: mailboxEmail,
      refresh_token_encrypted: encrypted,
      scopes: params.scopes || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "provider" },
  );

  if (error) {
    console.error("[google-credentials] save_failed");
    throw new Error("Could not store Google Workspace credentials.");
  }
}

export function hasEnvGmailRefreshToken(): boolean {
  return Boolean(process.env.GOOGLE_GMAIL_REFRESH_TOKEN?.trim());
}

export function hasEnvCalendarRefreshToken(): boolean {
  return Boolean(process.env.GOOGLE_REFRESH_TOKEN?.trim());
}

export function isGoogleOAuthClientConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() &&
      process.env.GOOGLE_CLIENT_SECRET?.trim(),
  );
}
