"use client";

import {
  formatAttachmentByteSize,
  GMAIL_ATTACHMENT_MAX_FILES,
  GMAIL_ATTACHMENT_MAX_FILE_BYTES,
  GMAIL_ATTACHMENT_MAX_TOTAL_BYTES,
  isBlockedAttachmentFilename,
} from "@/lib/google/gmail-attachments";

export type ComposerAttachment = {
  id: string;
  file: File;
};

type GmailComposerAttachmentsProps = {
  idPrefix: string;
  files: ComposerAttachment[];
  disabled?: boolean;
  onChange: (files: ComposerAttachment[]) => void;
  error?: string | null;
};

function fileKey(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

export function validateComposerFiles(
  files: ComposerAttachment[],
): string | null {
  if (files.length > GMAIL_ATTACHMENT_MAX_FILES) {
    return `You can attach up to ${GMAIL_ATTACHMENT_MAX_FILES} files per message.`;
  }
  let total = 0;
  for (const { file } of files) {
    if (isBlockedAttachmentFilename(file.name)) {
      return `"${file.name}" is not an allowed attachment type.`;
    }
    if (file.size > GMAIL_ATTACHMENT_MAX_FILE_BYTES) {
      return `"${file.name}" exceeds the ${formatAttachmentByteSize(GMAIL_ATTACHMENT_MAX_FILE_BYTES)} per-file limit.`;
    }
    total += file.size;
  }
  if (total > GMAIL_ATTACHMENT_MAX_TOTAL_BYTES) {
    return `Attachments exceed the ${formatAttachmentByteSize(GMAIL_ATTACHMENT_MAX_TOTAL_BYTES)} total limit.`;
  }
  return null;
}

export default function GmailComposerAttachments({
  idPrefix,
  files,
  disabled = false,
  onChange,
  error = null,
}: GmailComposerAttachmentsProps) {
  const inputId = `${idPrefix}-attachments`;

  function addFiles(list: FileList | null) {
    if (!list?.length || disabled) return;
    const existing = new Set(files.map((f) => fileKey(f.file)));
    const next = [...files];
    for (const file of Array.from(list)) {
      const key = fileKey(file);
      if (existing.has(key)) continue;
      existing.add(key);
      next.push({ id: `${key}-${Math.random().toString(36).slice(2, 8)}`, file });
    }
    onChange(next);
  }

  function removeFile(id: string) {
    onChange(files.filter((f) => f.id !== id));
  }

  return (
    <div className="job-comm-attach-composer">
      <div className="job-comm-attach-composer-row">
        <label className="admin-label" htmlFor={inputId}>
          Attachments
        </label>
        <input
          id={inputId}
          type="file"
          className="job-comm-attach-input"
          multiple
          disabled={disabled}
          accept="image/jpeg,image/png,image/webp,application/pdf,.pdf,.doc,.docx,.xls,.xlsx,.txt"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      <p className="job-comm-hint">
        JPEG, PNG, WebP, PDF, and common documents. Up to{" "}
        {GMAIL_ATTACHMENT_MAX_FILES} files,{" "}
        {formatAttachmentByteSize(GMAIL_ATTACHMENT_MAX_TOTAL_BYTES)} total.
      </p>
      {files.length > 0 ? (
        <ul className="job-comm-attach-pending" aria-label="Files to send">
          {files.map(({ id, file }) => (
            <li key={id} className="job-comm-attach-pending-item">
              <span className="job-comm-attach-pending-name">{file.name}</span>
              <span className="job-comm-attach-pending-size">
                {formatAttachmentByteSize(file.size)}
              </span>
              <button
                type="button"
                className="job-comm-attach-remove"
                disabled={disabled}
                onClick={() => removeFile(id)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {error ? (
        <p className="job-comm-feedback is-error" role="status">{error}</p>
      ) : null}
    </div>
  );
}
