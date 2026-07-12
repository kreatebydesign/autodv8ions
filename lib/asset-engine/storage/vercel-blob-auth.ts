import { getVercelOidcToken } from "@vercel/oidc";

/**
 * Credential options for @vercel/blob SDK calls.
 * Never log these values.
 */
export type VercelBlobAuthOptions = {
  /** Explicit static RW token — only for local/off-Vercel fallback. */
  token?: string;
  /** Vercel OIDC token paired with storeId. */
  oidcToken?: string;
  /** Blob store id from BLOB_STORE_ID (store_<id> or bare id). */
  storeId?: string;
  /** Which auth path was selected (safe to log). */
  mode: "oidc" | "static_token";
};

function readEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value || null;
}

/**
 * Resolve Vercel Blob credentials without requiring a long-lived RW token.
 *
 * Order (matches @vercel/blob SDK docs, except we never force an empty token):
 * 1. OIDC + store id when BLOB_STORE_ID is present (preferred on Vercel)
 * 2. Optional BLOB_READ_WRITE_TOKEN fallback for local / off-Vercel only
 *
 * Important: do NOT pass `token: undefined` or an empty token — an explicit
 * `token` option always wins over OIDC in the SDK.
 */
export async function resolveVercelBlobAuthOptions(): Promise<VercelBlobAuthOptions> {
  const storeId = readEnv("BLOB_STORE_ID");
  const staticToken = readEnv("BLOB_READ_WRITE_TOKEN");

  if (storeId) {
    let oidcToken = readEnv("VERCEL_OIDC_TOKEN");

    // Runtime helper covers cases where the env var is not yet mirrored into process.env.
    if (!oidcToken) {
      try {
        oidcToken = (await getVercelOidcToken())?.trim() || null;
      } catch {
        oidcToken = null;
      }
    }

    if (oidcToken) {
      return {
        mode: "oidc",
        storeId,
        oidcToken,
      };
    }

    // Store connected but OIDC token missing — still pass storeId and let the
    // SDK attempt automatic env resolution; do not require static token.
    return {
      mode: "oidc",
      storeId,
    };
  }

  if (staticToken) {
    return {
      mode: "static_token",
      token: staticToken,
    };
  }

  throw new Error(
    "Vercel Blob is not configured. On Vercel, connect a private Blob store so BLOB_STORE_ID is set and OIDC can authenticate. For local/off-Vercel only, set BLOB_READ_WRITE_TOKEN (optional fallback) or run vercel env pull for VERCEL_OIDC_TOKEN + BLOB_STORE_ID.",
  );
}

/**
 * Strip auth mode and return only SDK-safe option fields.
 * Omits undefined keys so we never pass an empty `token`.
 */
export function toBlobSdkAuthFields(
  auth: VercelBlobAuthOptions,
): { token?: string; oidcToken?: string; storeId?: string } {
  const fields: { token?: string; oidcToken?: string; storeId?: string } = {};
  if (auth.mode === "static_token" && auth.token) {
    fields.token = auth.token;
    return fields;
  }
  if (auth.storeId) fields.storeId = auth.storeId;
  if (auth.oidcToken) fields.oidcToken = auth.oidcToken;
  return fields;
}

export function isVercelBlobOidcConfigured(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return Boolean(env.BLOB_STORE_ID?.trim());
}
