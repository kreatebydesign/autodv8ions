/**
 * Gmail credential helpers — thin wrappers over shared Workspace storage.
 * Prefer google_workspace DB token; fall back to GOOGLE_GMAIL_REFRESH_TOKEN.
 */

import {
  hasEnvGmailRefreshToken,
  loadStoredWorkspaceCredential,
  resolveWorkspaceRefreshToken,
  saveWorkspaceCredential,
  type StoredWorkspaceCredential,
} from "@/lib/google/workspace-credentials";

export { hasEnvGmailRefreshToken };

export type StoredGmailCredential = {
  mailboxEmail: string;
  refreshToken: string;
  scopes: string | null;
  updatedAt: string | null;
};

function toGmailCredential(
  stored: StoredWorkspaceCredential,
): StoredGmailCredential {
  return {
    mailboxEmail: stored.mailboxEmail,
    refreshToken: stored.refreshToken,
    scopes: stored.scopes,
    updatedAt: stored.updatedAt,
  };
}

export async function resolveGmailRefreshToken(): Promise<string | null> {
  return resolveWorkspaceRefreshToken(
    process.env.GOOGLE_GMAIL_REFRESH_TOKEN || null,
  );
}

export async function loadStoredGmailCredential(): Promise<StoredGmailCredential | null> {
  const stored = await loadStoredWorkspaceCredential();
  return stored ? toGmailCredential(stored) : null;
}

export async function saveGmailCredential(params: {
  mailboxEmail: string;
  refreshToken: string;
  scopes?: string | null;
}): Promise<void> {
  await saveWorkspaceCredential(params);
}
