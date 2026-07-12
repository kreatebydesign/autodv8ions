import { getVercelOidcToken } from "@vercel/oidc";
import {
  ExternalAccountClient,
  type BaseExternalAccountClient,
} from "google-auth-library";

export const DRIVE_READONLY_SCOPE =
  "https://www.googleapis.com/auth/drive.readonly";

/**
 * Required for Allowed-audiences WIF (Vercel Global issuer + aud https://vercel.com/{team}).
 * GCP_AUDIENCE is intentionally NOT required: passing it to getVercelOidcToken()
 * forces a token exchange that can rewrite iss to https://oidc.vercel.com/{team}.
 */
export const REQUIRED_WIF_ENV_VARS = [
  "GCP_PROJECT_NUMBER",
  "GCP_SERVICE_ACCOUNT_EMAIL",
  "GCP_WORKLOAD_IDENTITY_POOL_ID",
  "GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID",
] as const;

export type DriveAuthMode = "wif" | "oauth_legacy" | "none";

export class DriveAuthError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "DriveAuthError";
    this.code = code;
  }
}

type EnvMap = Record<string, string | undefined>;

function readEnv(name: string, env: EnvMap = process.env) {
  const value = env[name]?.trim();
  return value || null;
}

/**
 * STS audience for ExternalAccountClient (Google resource name form).
 * This is NOT the Vercel OIDC token `aud` claim.
 */
export function buildWorkloadIdentityAudience(env: EnvMap = process.env): string {
  const projectNumber = readEnv("GCP_PROJECT_NUMBER", env);
  const poolId = readEnv("GCP_WORKLOAD_IDENTITY_POOL_ID", env);
  const providerId = readEnv("GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID", env);

  if (!projectNumber || !poolId || !providerId) {
    throw new DriveAuthError(
      "missing_wif_config",
      "Workload Identity Federation is not fully configured.",
    );
  }

  return `//iam.googleapis.com/projects/${projectNumber}/locations/global/workloadIdentityPools/${poolId}/providers/${providerId}`;
}

/**
 * Whether to ask @vercel/oidc to exchange the runtime token for a custom audience.
 *
 * Allowed-audiences mode (provider accepts https://vercel.com/{team}):
 *   must use the RAW token — do not exchange.
 *
 * Default-audience mode (provider accepts iam.googleapis.com/... audience):
 *   exchange is required, but the exchanged token may use a team-scoped issuer.
 *   That only works if the GCP provider issuer matches that exchanged iss.
 *
 * For Global issuer + Allowed audiences (current AutoDV8ions setup), returns false.
 */
export function shouldExchangeVercelOidcForAudience(
  gcpAudience: string | null | undefined,
): boolean {
  if (!gcpAudience) return false;
  const trimmed = gcpAudience.trim();
  // Native Vercel token aud — never exchange for this.
  if (/^https:\/\/vercel\.com\//i.test(trimmed)) return false;
  // GCP default-audience URL — exchange only when explicitly configured.
  return /iam\.googleapis\.com\/projects\//i.test(trimmed);
}

export function getMissingWifEnvVars(env: EnvMap = process.env): string[] {
  return REQUIRED_WIF_ENV_VARS.filter((name) => !readEnv(name, env));
}

export function isGoogleDriveWifConfigured(env: EnvMap = process.env): boolean {
  return getMissingWifEnvVars(env).length === 0;
}

export function isGoogleDriveOAuthLegacyConfigured(
  env: EnvMap = process.env,
): boolean {
  return Boolean(
    readEnv("GOOGLE_CLIENT_ID", env) &&
      readEnv("GOOGLE_CLIENT_SECRET", env) &&
      readEnv("GOOGLE_REFRESH_TOKEN", env),
  );
}

export function hasDriveFolderTarget(env: EnvMap = process.env): boolean {
  return Boolean(
    readEnv("GOOGLE_DRIVE_TINT_JOBS_FOLDER_ID", env) ||
      readEnv("GOOGLE_DRIVE_CONTENT_VAULT_FOLDER_ID", env) ||
      readEnv("GOOGLE_DRIVE_UPLOADS_FOLDER_ID", env),
  );
}

export function getDriveAuthMode(env: EnvMap = process.env): DriveAuthMode {
  if (isGoogleDriveWifConfigured(env) && hasDriveFolderTarget(env)) {
    return "wif";
  }
  if (isGoogleDriveOAuthLegacyConfigured(env) && hasDriveFolderTarget(env)) {
    return "oauth_legacy";
  }
  return "none";
}

/**
 * Obtain the subject token for Google STS.
 * For Allowed-audiences + Global issuer: raw getVercelOidcToken() with no audience option.
 */
export async function getVercelSubjectTokenForDrive(
  env: EnvMap = process.env,
): Promise<string> {
  const gcpAudience = readEnv("GCP_AUDIENCE", env);
  const exchange = shouldExchangeVercelOidcForAudience(gcpAudience);

  try {
    if (exchange && gcpAudience) {
      return await getVercelOidcToken({ audience: gcpAudience });
    }
    return await getVercelOidcToken();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "OIDC token retrieval failed";
    throw new DriveAuthError(
      "oidc_token_unavailable",
      `Unable to obtain Vercel OIDC token. On production this requires OIDC federation. Locally use a linked Vercel project and vercel env pull. (${sanitizeErrorMessage(message)})`,
    );
  }
}

/**
 * Authenticate to Google Drive via Vercel OIDC → GCP Workload Identity Federation.
 * Does not log tokens or credentials.
 */
export async function getDriveAuthClientViaWif(
  env: EnvMap = process.env,
): Promise<BaseExternalAccountClient> {
  const missing = getMissingWifEnvVars(env);
  if (missing.length > 0) {
    throw new DriveAuthError(
      "missing_wif_config",
      `Missing Workload Identity configuration: ${missing.join(", ")}.`,
    );
  }

  const serviceAccountEmail = readEnv("GCP_SERVICE_ACCOUNT_EMAIL", env)!;
  const stsAudience = buildWorkloadIdentityAudience(env);

  const oidcToken = await getVercelSubjectTokenForDrive(env);
  if (!oidcToken) {
    throw new DriveAuthError(
      "oidc_token_unavailable",
      "Vercel OIDC token was empty.",
    );
  }

  let authClient: BaseExternalAccountClient | null;
  try {
    authClient = ExternalAccountClient.fromJSON({
      type: "external_account",
      audience: stsAudience,
      subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
      token_url: "https://sts.googleapis.com/v1/token",
      service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${serviceAccountEmail}:generateAccessToken`,
      subject_token_supplier: {
        // Re-fetch on each STS exchange; do not force audience exchange for Allowed-audiences mode.
        getSubjectToken: async () => getVercelSubjectTokenForDrive(env),
      },
    });
  } catch (error) {
    throw new DriveAuthError(
      "wif_client_init_failed",
      `Failed to initialize Workload Identity client. (${sanitizeErrorMessage(
        error instanceof Error ? error.message : "unknown error",
      )})`,
    );
  }

  if (!authClient) {
    throw new DriveAuthError(
      "wif_client_init_failed",
      "Failed to initialize Workload Identity client.",
    );
  }

  authClient.scopes = [DRIVE_READONLY_SCOPE];
  return authClient;
}

export function sanitizeErrorMessage(message: string): string {
  return message
    .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, "Bearer [redacted]")
    .replace(/eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+/g, "[jwt]")
    .replace(/private[_-]?key[^.]{0,40}/gi, "private_key [redacted]")
    .slice(0, 280);
}
