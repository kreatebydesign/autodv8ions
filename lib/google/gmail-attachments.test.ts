import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { gmail_v1 } from "googleapis";
import {
  buildMultipartMixedMime,
  extractAttachmentMetaFromPayload,
  findAttachmentOnMessage,
  isBlockedAttachmentFilename,
  validateOutboundAttachmentFile,
  validateOutboundAttachmentBatch,
} from "./gmail-attachments";

describe("gmail attachment metadata", () => {
  it("finds nested PDF attachment parts", () => {
    const payload: gmail_v1.Schema$MessagePart = {
      mimeType: "multipart/mixed",
      parts: [
        {
          mimeType: "text/plain",
          body: { data: "dGV4dA" },
        },
        {
          mimeType: "application/pdf",
          filename: "quote.pdf",
          partId: "1",
          body: { attachmentId: "att-99", size: 4096 },
          headers: [
            {
              name: "Content-Disposition",
              value: 'attachment; filename="quote.pdf"',
            },
          ],
        },
      ],
    };

    const meta = extractAttachmentMetaFromPayload(payload);
    assert.equal(meta.length, 1);
    assert.equal(meta[0].filename, "quote.pdf");
    assert.equal(meta[0].attachmentId, "att-99");
    assert.equal(
      findAttachmentOnMessage(meta, { attachmentId: "att-99" })?.partId,
      "1",
    );
  });

  it("returns null for unknown attachment ids", () => {
    const meta = extractAttachmentMetaFromPayload({
      mimeType: "application/pdf",
      filename: "x.pdf",
      body: { attachmentId: "a1", size: 10 },
    });
    assert.equal(findAttachmentOnMessage(meta, { attachmentId: "missing" }), null);
  });
});

describe("gmail outbound attachment validation", () => {
  it("accepts small PDF payloads", () => {
    const data = Buffer.from("%PDF-1.4 test");
    const result = validateOutboundAttachmentFile({
      filename: "estimate.pdf",
      mimeType: "application/pdf",
      data,
    });
    assert.equal(result.ok, true);
  });

  it("blocks executable extensions", () => {
    assert.equal(isBlockedAttachmentFilename("virus.exe"), true);
    const result = validateOutboundAttachmentFile({
      filename: "run.exe",
      mimeType: "application/octet-stream",
      data: Buffer.from("MZ"),
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, "gmail_attachment_type_blocked");
  });

  it("enforces total size limits", () => {
    const file = Buffer.alloc(1024, 1);
    const batch = validateOutboundAttachmentBatch(
      Array.from({ length: 9 }, (_, i) => ({
        filename: `f${i}.pdf`,
        mimeType: "application/pdf",
        data: file,
      })),
    );
    assert.equal(batch.ok, false);
    if (!batch.ok) assert.equal(batch.code, "gmail_attachment_too_many");
  });
});

describe("gmail multipart mime", () => {
  it("builds multipart/mixed when attachments are present", () => {
    const mime = buildMultipartMixedMime({
      headers: ["From: a@b.com", "To: c@d.com", "Subject: Test"],
      body: "Hello with file",
      attachments: [
        {
          filename: "photo.jpg",
          mimeType: "image/jpeg",
          data: Buffer.from([0xff, 0xd8, 0xff, 0x00]),
        },
      ],
    });
    assert.match(mime, /multipart\/mixed/);
    assert.match(mime, /photo\.jpg/);
    assert.match(mime, /SGVsbG8gd2l0aCBmaWxl/);
  });
});
