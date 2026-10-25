import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EMAIL_TEMPLATES,
  applyReviewLinkPlaceholder,
  getEmailTemplate,
} from "./email-templates";

describe("email templates", () => {
  it("includes five composer templates plus review", () => {
    assert.equal(EMAIL_TEMPLATES.length, 6);
    assert.equal(getEmailTemplate("window_tint_quote")?.label, "Window Tint Quote");
    assert.match(getEmailTemplate("follow_up")?.body || "", /checking in/i);
  });

  it("replaces review link placeholder", () => {
    const body = applyReviewLinkPlaceholder(
      "Link: {{REVIEW_LINK}}",
      "https://g.page/r/example/review",
    );
    assert.match(body, /https:\/\/g\.page\/r\/example\/review/);
    assert.doesNotMatch(body, /\{\{REVIEW_LINK\}\}/);
  });
});
