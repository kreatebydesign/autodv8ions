import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  GOOGLE_WORKSPACE_OAUTH_SCOPES,
  buildGoogleWorkspaceReconnectStartPath,
  workspaceScopesAreSufficient,
} from "./gmail-auth";
import { buildGoogleWorkspaceReconnectHref } from "./gmail-ui";

describe("google workspace reconnect", () => {
  it("requests both Gmail and Calendar scopes", () => {
    assert.deepEqual(GOOGLE_WORKSPACE_OAUTH_SCOPES, [
      "https://www.googleapis.com/auth/gmail.modify",
      "https://www.googleapis.com/auth/calendar",
    ]);
  });

  it("accepts only tokens that include both required scopes", () => {
    assert.equal(
      workspaceScopesAreSufficient(
        "https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/calendar",
      ),
      true,
    );
    assert.equal(
      workspaceScopesAreSufficient("https://www.googleapis.com/auth/gmail.modify"),
      false,
    );
    assert.equal(
      workspaceScopesAreSufficient("https://www.googleapis.com/auth/calendar"),
      false,
    );
  });

  it("builds a single reconnect start path for both integrations", () => {
    assert.equal(
      buildGoogleWorkspaceReconnectStartPath("/admin/jobs?jobId=abc"),
      "/api/admin/google/oauth/start?returnTo=%2Fadmin%2Fjobs%3FjobId%3Dabc",
    );
    assert.equal(
      buildGoogleWorkspaceReconnectHref("/admin/dashboard"),
      "/api/admin/google/oauth/start?returnTo=%2Fadmin%2Fdashboard",
    );
  });
});
