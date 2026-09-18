import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyGmailApiError,
  isGmailAuthorizationErrorCode,
  isGmailTemporaryErrorCode,
  mapGmailApiError,
} from "./gmail-errors";

describe("classifyGmailApiError", () => {
  it("classifies invalid_grant token refresh failures as auth", () => {
    const result = classifyGmailApiError({
      code: 400,
      response: {
        status: 400,
        data: {
          error: "invalid_grant",
          error_description: "Token has been expired or revoked.",
        },
      },
      message: "invalid_grant",
    });

    assert.equal(result.kind, "auth");
    assert.equal(result.status, 401);
  });

  it("classifies HTTP 401 as auth", () => {
    const result = classifyGmailApiError({
      code: 401,
      message: "Request had invalid authentication credentials.",
    });
    assert.equal(result.kind, "auth");
  });

  it("classifies rate limits and 5xx as temporary", () => {
    assert.equal(classifyGmailApiError({ code: 429, message: "rateLimitExceeded" }).kind, "temporary");
    assert.equal(classifyGmailApiError({ code: 503, message: "backendError" }).kind, "temporary");
    assert.equal(
      classifyGmailApiError({ message: "socket hang up" }).kind,
      "temporary",
    );
  });

  it("classifies missing threads as not_found", () => {
    assert.equal(classifyGmailApiError({ code: 404, message: "Not Found" }).kind, "not_found");
  });
});

describe("mapGmailApiError", () => {
  it("maps auth failures to gmail_auth_failed with reconnect-safe message", () => {
    const mapped = mapGmailApiError(
      {
        response: {
          status: 400,
          data: {
            error: "invalid_grant",
            error_description: "Token has been expired or revoked.",
          },
        },
        message: "invalid_grant",
      },
      "gmail_api_failed",
      "Gmail API request failed.",
    );

    assert.equal(mapped.code, "gmail_auth_failed");
    assert.equal(mapped.status, 401);
    assert.match(mapped.message, /Reconnect/i);
    assert.doesNotMatch(mapped.message, /1\/\//);
    assert.doesNotMatch(mapped.message, /ya29/);
  });

  it("maps temporary outages distinctly from auth failures", () => {
    const mapped = mapGmailApiError(
      { code: 503, message: "Service Unavailable" },
      "gmail_api_failed",
      "Gmail API request failed.",
    );
    assert.equal(mapped.code, "gmail_temporarily_unavailable");
    assert.equal(mapped.status, 502);
  });
});

describe("error code helpers", () => {
  it("distinguishes authorization codes from temporary codes", () => {
    assert.equal(isGmailAuthorizationErrorCode("gmail_auth_failed"), true);
    assert.equal(isGmailAuthorizationErrorCode("gmail_temporarily_unavailable"), false);
    assert.equal(isGmailTemporaryErrorCode("gmail_temporarily_unavailable"), true);
    assert.equal(isGmailTemporaryErrorCode("gmail_auth_failed"), false);
  });
});
