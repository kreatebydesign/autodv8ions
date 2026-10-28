import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  TINT_QUOTE_HEADER_CTA_LABEL,
  TINT_QUOTE_HREF,
} from "./tint-quote-cta";

describe("tint quote CTA constants", () => {
  it("uses approved header label and existing form route", () => {
    assert.equal(TINT_QUOTE_HEADER_CTA_LABEL, "Get a Tint Quote");
    assert.equal(TINT_QUOTE_HREF, "/tint-quote");
  });
});
