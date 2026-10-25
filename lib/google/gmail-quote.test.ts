import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { splitPlainTextEmailBody } from "./gmail-quote";

describe("splitPlainTextEmailBody", () => {
  it("keeps short bodies intact", () => {
    assert.deepEqual(splitPlainTextEmailBody("Hello there"), {
      primary: "Hello there",
      quoted: null,
    });
  });

  it("splits on On ... wrote markers", () => {
    const text = "Thanks!\n\nOn Mon, Jan 1, 2026 at 9:00 AM Customer <c@example.com> wrote:\n> old";
    const split = splitPlainTextEmailBody(text);
    assert.equal(split.primary, "Thanks!");
    assert.match(split.quoted || "", /wrote:/);
  });

  it("splits leading quote lines", () => {
    const text = "New reply\n\n> quoted line one\n> quoted line two";
    const split = splitPlainTextEmailBody(text);
    assert.equal(split.primary, "New reply");
    assert.match(split.quoted || "", /^>/);
  });
});
