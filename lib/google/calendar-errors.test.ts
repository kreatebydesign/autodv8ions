import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isCalendarAuthorizationErrorCode,
  isCalendarTemporaryErrorCode,
  mapCalendarApiError,
} from "./calendar-errors";

describe("mapCalendarApiError", () => {
  it("maps invalid_grant refresh failures to calendar_auth_failed", () => {
    const mapped = mapCalendarApiError({
      response: {
        status: 400,
        data: {
          error: "invalid_grant",
          error_description: "Token has been expired or revoked.",
        },
      },
      message: "invalid_grant",
    });

    assert.equal(mapped.code, "calendar_auth_failed");
    assert.equal(mapped.status, 401);
    assert.match(mapped.message, /Reconnect/i);
    assert.doesNotMatch(mapped.message, /1\/\//);
  });

  it("maps temporary outages distinctly from auth failures", () => {
    const mapped = mapCalendarApiError({
      code: 503,
      message: "Service Unavailable",
    });
    assert.equal(mapped.code, "calendar_temporarily_unavailable");
    assert.equal(mapped.status, 502);
  });

  it("maps missing events to calendar_event_missing", () => {
    const mapped = mapCalendarApiError({ code: 404, message: "Not Found" });
    assert.equal(mapped.code, "calendar_event_missing");
    assert.equal(mapped.status, 404);
  });
});

describe("calendar error code helpers", () => {
  it("distinguishes authorization codes from temporary codes", () => {
    assert.equal(isCalendarAuthorizationErrorCode("calendar_auth_failed"), true);
    assert.equal(
      isCalendarTemporaryErrorCode("calendar_temporarily_unavailable"),
      true,
    );
    assert.equal(
      isCalendarAuthorizationErrorCode("calendar_temporarily_unavailable"),
      false,
    );
  });
});
