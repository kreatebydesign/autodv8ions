import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import {
  appendGmailReconnectQuery,
  buildGmailReconnectStartPath,
  createGmailOAuthState,
  getRequiredGmailMailbox,
  isAllowedGmailReturnTo,
  resolveGmailOAuthRedirectUri,
  sanitizeGmailReturnTo,
  verifyGmailOAuthState,
} from "./gmail-auth";

describe("gmail oauth helpers", () => {
  const previousSecret = process.env.ADMIN_SESSION_SECRET;
  const previousUser = process.env.GOOGLE_GMAIL_USER;

  before(() => {
    process.env.ADMIN_SESSION_SECRET = "test-admin-session-secret-for-gmail-oauth";
    process.env.GOOGLE_GMAIL_USER = "sales@autodv8ions.com";
  });

  after(() => {
    if (previousSecret === undefined) delete process.env.ADMIN_SESSION_SECRET;
    else process.env.ADMIN_SESSION_SECRET = previousSecret;
    if (previousUser === undefined) delete process.env.GOOGLE_GMAIL_USER;
    else process.env.GOOGLE_GMAIL_USER = previousUser;
  });

  it("requires the sales mailbox", () => {
    assert.equal(getRequiredGmailMailbox(), "sales@autodv8ions.com");
  });

  it("only allows admin return paths", () => {
    assert.equal(isAllowedGmailReturnTo("/admin/jobs?jobId=abc"), true);
    assert.equal(isAllowedGmailReturnTo("/admin"), true);
    assert.equal(isAllowedGmailReturnTo("https://evil.example/"), false);
    assert.equal(isAllowedGmailReturnTo("//evil.example"), false);
    assert.equal(isAllowedGmailReturnTo("/public"), false);
    assert.equal(sanitizeGmailReturnTo("/admin/jobs?jobId=1"), "/admin/jobs?jobId=1");
    assert.equal(sanitizeGmailReturnTo("/oops"), "/admin/jobs");
  });

  it("uses localhost redirect for local requests and production origin otherwise", () => {
    assert.equal(
      resolveGmailOAuthRedirectUri("http://localhost:3000/api/admin/google/oauth/start"),
      "http://localhost:3000/api/auth/google/callback",
    );
    assert.equal(
      resolveGmailOAuthRedirectUri("https://www.autodv8ions.com/api/admin/google/oauth/start"),
      "https://www.autodv8ions.com/api/auth/google/callback",
    );
  });

  it("signs and verifies oauth state", async () => {
    const { token, payload } = await createGmailOAuthState(
      "/admin/jobs?jobId=job-22",
    );
    assert.equal(payload.purpose, "google_workspace_reconnect");
    assert.equal(payload.returnTo, "/admin/jobs?jobId=job-22");

    const verified = await verifyGmailOAuthState(token);
    assert.ok(verified);
    assert.equal(verified?.returnTo, "/admin/jobs?jobId=job-22");
    assert.equal(await verifyGmailOAuthState("tampered." + token), null);
  });

  it("appends safe reconnect result query params", () => {
    assert.equal(
      appendGmailReconnectQuery("/admin/jobs?jobId=1", "connected"),
      "/admin/jobs?jobId=1&google=connected&gmail=connected",
    );
    assert.equal(
      appendGmailReconnectQuery("/admin/jobs", "error", "gmail_wrong_account"),
      "/admin/jobs?google=error&googleCode=gmail_wrong_account&gmail=error&gmailCode=gmail_wrong_account",
    );
  });

  it("builds workspace reconnect start path", () => {
    assert.equal(
      buildGmailReconnectStartPath("/admin/jobs?jobId=job-1"),
      "/api/admin/google/oauth/start?returnTo=%2Fadmin%2Fjobs%3FjobId%3Djob-1",
    );
  });
});
