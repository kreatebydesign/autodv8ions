"use client";

import { useMemo } from "react";
import {
  formatAttachmentByteSize,
  type ParsedGmailAttachmentMeta,
} from "@/lib/google/gmail-attachments";

type GmailMessageAttachmentsProps = {
  jobId: string;
  gmailMessageId: string;
  attachments: ParsedGmailAttachmentMeta[];
};

function attachmentQuery(
  jobId: string,
  gmailMessageId: string,
  attachment: ParsedGmailAttachmentMeta,
  disposition: "attachment" | "inline",
): string {
  const params = new URLSearchParams({
    messageId: gmailMessageId,
    disposition,
  });
  if (attachment.attachmentId) {
    params.set("attachmentId", attachment.attachmentId);
  }
  if (attachment.partId) {
    params.set("partId", attachment.partId);
  }
  return `/api/jobs/${encodeURIComponent(jobId)}/gmail/attachments?${params.toString()}`;
}

function fileIconLabel(mimeType: string): string {
  const mime = mimeType.toLowerCase();
  if (mime === "application/pdf") return "PDF";
  if (mime.startsWith("image/")) return "IMG";
  if (mime.startsWith("text/")) return "TXT";
  return "FILE";
}

export default function GmailMessageAttachments({
  jobId,
  gmailMessageId,
  attachments,
}: GmailMessageAttachmentsProps) {
  const items = useMemo(
    () => attachments.filter((a) => a.attachmentId || a.embedded),
    [attachments],
  );

  if (!items.length) return null;

  return (
    <ul className="job-comm-attach-list" aria-label="Email attachments">
      {items.map((attachment) => {
        const downloadHref = attachmentQuery(
          jobId,
          gmailMessageId,
          attachment,
          "attachment",
        );
        const previewHref = attachment.previewable
          ? attachmentQuery(jobId, gmailMessageId, attachment, "inline")
          : null;

        return (
          <li key={`${attachment.partId}:${attachment.attachmentId || "embedded"}`} className="job-comm-attach-item">
            <span className="job-comm-attach-icon" aria-hidden="true">
              {fileIconLabel(attachment.mimeType)}
            </span>
            <div className="job-comm-attach-meta">
              <p className="job-comm-attach-name">{attachment.filename}</p>
              <p className="job-comm-attach-sub">
                {attachment.mimeType.split(";")[0]} ·{" "}
                {formatAttachmentByteSize(attachment.size)}
              </p>
            </div>
            <div className="job-comm-attach-actions">
              {previewHref && attachment.mimeType.startsWith("image/") ? (
                <a
                  className="job-comm-attach-link"
                  href={previewHref}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Preview
                </a>
              ) : null}
              <a className="job-comm-attach-link" href={downloadHref} download>
                Download
              </a>
            </div>
            {previewHref && attachment.mimeType.startsWith("image/") ? (
              // Authenticated same-origin API URL; next/image does not apply here.
              // eslint-disable-next-line @next/next/no-img-element -- session-gated Gmail attachment preview
              <img
                className="job-comm-attach-preview"
                src={previewHref}
                alt={attachment.filename}
                loading="lazy"
                decoding="async"
              />
            ) : null}
            {previewHref && attachment.mimeType === "application/pdf" ? (
              <iframe
                className="job-comm-attach-pdf"
                src={previewHref}
                title={`Preview ${attachment.filename}`}
              />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
