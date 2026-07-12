import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import {
  resolveVercelBlobAuthOptions,
  toBlobSdkAuthFields,
  isVercelBlobOidcConfigured,
} from "./vercel-blob-auth";

const ORIGINAL_ENV = { ...process.env };

function clearBlobEnv() {
  delete process.env.BLOB_STORE_ID;
  delete process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.VERCEL_OIDC_TOKEN;
}

describe("vercel blob auth resolution", () => {
  beforeEach(() => {
    clearBlobEnv();
  });

  afterEach(() => {
    clearBlobEnv();
    for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("prefers OIDC + store id over static token", async () => {
    process.env.BLOB_STORE_ID = "store_abc123";
    process.env.VERCEL_OIDC_TOKEN = "oidc.jwt.token";
    process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_should_not_win";

    const auth = await resolveVercelBlobAuthOptions();
    assert.equal(auth.mode, "oidc");
    assert.equal(auth.storeId, "store_abc123");
    assert.equal(auth.oidcToken, "oidc.jwt.token");
    assert.equal(auth.token, undefined);

    const fields = toBlobSdkAuthFields(auth);
    assert.equal(fields.token, undefined);
    assert.equal(fields.storeId, "store_abc123");
    assert.equal(fields.oidcToken, "oidc.jwt.token");
  });

  it("does not require BLOB_READ_WRITE_TOKEN when store id is present", async () => {
    process.env.BLOB_STORE_ID = "store_only";
    process.env.VERCEL_OIDC_TOKEN = "oidc.only";

    const auth = await resolveVercelBlobAuthOptions();
    assert.equal(auth.mode, "oidc");
    assert.equal(isVercelBlobOidcConfigured(), true);
  });

  it("falls back to static token only when store id is absent", async () => {
    process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_local";

    const auth = await resolveVercelBlobAuthOptions();
    assert.equal(auth.mode, "static_token");
    assert.ok(auth.token);
    assert.equal(toBlobSdkAuthFields(auth).token, "vercel_blob_rw_local");
    assert.equal(toBlobSdkAuthFields(auth).oidcToken, undefined);
  });

  it("throws a configuration error when neither OIDC store nor static token exists", async () => {
    await assert.rejects(
      () => resolveVercelBlobAuthOptions(),
      /Vercel Blob is not configured/i,
    );
  });

  it("never emits an empty token field that would override OIDC", async () => {
    process.env.BLOB_STORE_ID = "store_xyz";
    process.env.VERCEL_OIDC_TOKEN = "oidc.xyz";
    const fields = toBlobSdkAuthFields(await resolveVercelBlobAuthOptions());
    assert.ok(!("token" in fields) || fields.token === undefined);
  });
});
