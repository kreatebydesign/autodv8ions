import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  REQUIRED_WIF_ENV_VARS,
  buildWorkloadIdentityAudience,
  getDriveAuthMode,
  getMissingWifEnvVars,
  hasDriveFolderTarget,
  isGoogleDriveOAuthLegacyConfigured,
  isGoogleDriveWifConfigured,
  sanitizeErrorMessage,
} from "./auth-drive";

const completeWifEnv = {
  GCP_PROJECT_NUMBER: "719949077120",
  GCP_SERVICE_ACCOUNT_EMAIL:
    "autodv8ions-portfolio-sync@kxd-website-integrations.iam.gserviceaccount.com",
  GCP_WORKLOAD_IDENTITY_POOL_ID: "kxd-vercel",
  GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID: "vercel",
  GCP_AUDIENCE:
    "https://iam.googleapis.com/projects/719949077120/locations/global/workloadIdentityPools/kxd-vercel/providers/vercel",
  GOOGLE_DRIVE_TINT_JOBS_FOLDER_ID: "1AZE5ek1GeICb1qYr5pJ6VYXzr-21SAp5",
};

describe("WIF config detection", () => {
  it("requires all WIF env vars", () => {
    assert.deepEqual(getMissingWifEnvVars({}), [...REQUIRED_WIF_ENV_VARS]);
    assert.equal(isGoogleDriveWifConfigured({}), false);
    assert.equal(isGoogleDriveWifConfigured(completeWifEnv), true);
  });

  it("builds the STS audience resource path", () => {
    assert.equal(
      buildWorkloadIdentityAudience(completeWifEnv),
      "//iam.googleapis.com/projects/719949077120/locations/global/workloadIdentityPools/kxd-vercel/providers/vercel",
    );
  });

  it("throws a sanitized missing-config error when audience parts are incomplete", () => {
    assert.throws(
      () => buildWorkloadIdentityAudience({ GCP_PROJECT_NUMBER: "1" }),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.match(error.message, /not fully configured/i);
        return true;
      },
    );
  });

  it("prefers WIF when WIF + folder target are present", () => {
    assert.equal(getDriveAuthMode(completeWifEnv), "wif");
  });

  it("falls back to oauth_legacy when only OAuth is present", () => {
    const env = {
      GOOGLE_CLIENT_ID: "id",
      GOOGLE_CLIENT_SECRET: "secret",
      GOOGLE_REFRESH_TOKEN: "refresh",
      GOOGLE_DRIVE_TINT_JOBS_FOLDER_ID: "folder",
    };
    assert.equal(isGoogleDriveOAuthLegacyConfigured(env), true);
    assert.equal(getDriveAuthMode(env), "oauth_legacy");
  });

  it("returns none without a Drive folder target", () => {
    const env = {
      GCP_PROJECT_NUMBER: "719949077120",
      GCP_SERVICE_ACCOUNT_EMAIL: "sa@example.com",
      GCP_WORKLOAD_IDENTITY_POOL_ID: "kxd-vercel",
      GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID: "vercel",
      GCP_AUDIENCE: "https://example",
    };
    assert.equal(hasDriveFolderTarget(env), false);
    assert.equal(getDriveAuthMode(env), "none");
  });

  it("redacts token-like material from error messages", () => {
    const cleaned = sanitizeErrorMessage(
      "failed Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abc private_key SECRETDATA",
    );
    assert.doesNotMatch(cleaned, /eyJhbGciOiJIUzI1NiJ9/);
    assert.match(cleaned, /\[jwt\]|\[redacted\]/i);
  });
});
