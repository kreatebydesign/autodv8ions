import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildGmailThreadUrl,
  displaySenderLabel,
  getVisibleMessages,
  hasRenderablePlainBody,
} from "./gmail-ui";

describe("gmail-ui helpers", () => {
  it("builds a Gmail deep link without exposing raw query junk", () => {
    assert.equal(
      buildGmailThreadUrl("18abcDEF"),
      "https://mail.google.com/mail/u/0/#all/18abcDEF",
    );
    assert.equal(buildGmailThreadUrl(""), "https://mail.google.com/mail/");
  });

  it("shows newest messages by default and counts hidden earlier ones", () => {
    const messages = [1, 2, 3, 4, 5, 6, 7];
    const collapsed = getVisibleMessages(messages, { showAll: false, limit: 5 });
    assert.deepEqual(collapsed.visible, [3, 4, 5, 6, 7]);
    assert.equal(collapsed.hiddenCount, 2);

    const expanded = getVisibleMessages(messages, { showAll: true, limit: 5 });
    assert.deepEqual(expanded.visible, messages);
    assert.equal(expanded.hiddenCount, 0);
  });

  it("labels outgoing as AutoDV8ions and extracts display names", () => {
    assert.equal(displaySenderLabel("sales@autodv8ions.com", "outgoing"), "AutoDV8ions");
    assert.equal(
      displaySenderLabel("Chris Customer <chris@example.com>", "incoming"),
      "Chris Customer",
    );
  });

  it("detects plain-text renderability", () => {
    assert.equal(
      hasRenderablePlainBody({
        gmailMessageId: "1",
        direction: "incoming",
        from: "a@b.com",
        sentAt: null,
        plainTextBody: "Hello",
        htmlBody: null,
        unread: false,
      }),
      true,
    );
    assert.equal(
      hasRenderablePlainBody({
        gmailMessageId: "1",
        direction: "incoming",
        from: "a@b.com",
        sentAt: null,
        plainTextBody: "  ",
        htmlBody: "<p>Hi</p>",
        unread: false,
      }),
      false,
    );
  });
});
