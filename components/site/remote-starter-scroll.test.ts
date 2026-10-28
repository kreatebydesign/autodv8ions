import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isRemoteStarterPagePath,
  normalizeSitePathname,
  REMOTE_STARTER_PAGE_PATH,
} from "./remote-starter-scroll";

describe("remote-starter-scroll helpers", () => {
  it("normalizes trailing slashes for path comparison", () => {
    assert.equal(normalizeSitePathname("/services/remote-starters/"), REMOTE_STARTER_PAGE_PATH);
    assert.equal(normalizeSitePathname(REMOTE_STARTER_PAGE_PATH), REMOTE_STARTER_PAGE_PATH);
    assert.equal(normalizeSitePathname("/"), "/");
  });

  it("detects the remote starter route with or without a trailing slash", () => {
    assert.equal(isRemoteStarterPagePath("/services/remote-starters"), true);
    assert.equal(isRemoteStarterPagePath("/services/remote-starters/"), true);
    assert.equal(isRemoteStarterPagePath("/services"), false);
  });
});
