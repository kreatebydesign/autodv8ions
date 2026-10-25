import { createHash } from "node:crypto";
import type { gmail_v1 } from "googleapis";

function getHeader(
  headers: gmail_v1.Schema$MessagePartHeader[] | null | undefined,
  name: string,
): string {
  if (!headers?.length) return "";
  const target = name.toLowerCase();
  const hit = headers.find((h) => String(h.name || "").toLowerCase() === target);
  return String(hit?.value || "").trim();
}

/** Gmail message size limit is 25 MB; stay under for outbound totals. */
export const GMAIL_ATTACHMENT_MAX_FILE_BYTES = 20 * 1024 * 1024;
export const GMAIL_ATTACHMENT_MAX_TOTAL_BYTES = 24 * 1024 * 1024;
export const GMAIL_ATTACHMENT_MAX_DOWNLOAD_BYTES = 25 * 1024 * 1024;
export const GMAIL_ATTACHMENT_MAX_FILES = 8;

export type ParsedGmailAttachmentMeta = {
  partId: string;
  attachmentId: string | null;
  filename: string;
  mimeType: string;
  size: number;
  disposition: "attachment" | "inline";
  previewable: boolean;
  /** True when bytes are inline on the MIME part (no Gmail attachmentId). */
  embedded: boolean;
};

export type OutboundMimeAttachment = {
  filename: string;
  mimeType: string;
  data: Buffer;
};

const BLOCKED_EXTENSIONS = new Set([
  ".exe",
  ".bat",
  ".cmd",
  ".com",
  ".msi",
  ".scr",
  ".js",
  ".jse",
  ".vbs",
  ".vbe",
  ".wsf",
  ".wsh",
  ".ps1",
  ".psm1",
  ".sh",
  ".bash",
  ".jar",
  ".app",
  ".dmg",
  ".pkg",
  ".deb",
  ".rpm",
  ".dll",
  ".sys",
  ".drv",
  ".hta",
  ".reg",
  ".cpl",
  ".msp",
  ".msc",
  ".inf",
  ".lnk",
  ".pif",
  ".php",
  ".phtml",
  ".asp",
  ".aspx",
  ".cgi",
  ".pl",
  ".py",
  ".rb",
  ".html",
  ".htm",
  ".svg",
  ".xml",
]);

const ALLOWED_MIME_PREFIXES = ["image/", "text/plain", "application/pdf"];
const ALLOWED_MIME_EXACT = new Set([
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

export function sanitizeAttachmentFilename(raw: string): string {
  const base = raw.replace(/\\/g, "/").split("/").pop() || "attachment";
  const cleaned = base
    .replace(/[\x00-\x1f\x7f]/g, "")
    .replace(/[<>:"|?*]/g, "_")
    .trim()
    .slice(0, 180);
  return cleaned || "attachment";
}

export function formatAttachmentByteSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10_240 ? 1 : 0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isPreviewableAttachmentMime(mimeType: string): boolean {
  const mime = mimeType.toLowerCase().split(";")[0].trim();
  return mime === "application/pdf" || mime.startsWith("image/");
}

function contentTypeOf(part: gmail_v1.Schema$MessagePart): string {
  return String(part.mimeType || getHeader(part.headers, "Content-Type") || "")
    .toLowerCase()
    .split(";")[0]
    .trim();
}

function dispositionOf(part: gmail_v1.Schema$MessagePart): "attachment" | "inline" {
  const disposition = getHeader(part.headers, "Content-Disposition").toLowerCase();
  if (disposition.includes("inline")) return "inline";
  return "attachment";
}

function isAttachmentLikePart(part: gmail_v1.Schema$MessagePart): boolean {
  const disposition = getHeader(part.headers, "Content-Disposition").toLowerCase();
  if (disposition.includes("attachment")) return true;
  const mime = contentTypeOf(part);
  if (mime === "text/plain" || mime === "text/html") return false;
  if (part.filename && part.filename.trim()) return true;
  if (disposition.includes("inline") && mime.startsWith("image/")) return true;
  const attachmentId = part.body?.attachmentId;
  if (attachmentId && mime && mime !== "multipart/alternative" && !mime.startsWith("multipart/")) {
    return true;
  }
  return false;
}

/**
 * Walk nested MIME trees and collect attachment metadata (no bytes).
 */
export function extractAttachmentMetaFromPayload(
  payload: gmail_v1.Schema$MessagePart | null | undefined,
): ParsedGmailAttachmentMeta[] {
  const results: ParsedGmailAttachmentMeta[] = [];

  function visit(part: gmail_v1.Schema$MessagePart | null | undefined) {
    if (!part) return;

    const children = part.parts;
    if (children?.length) {
      for (const child of children) visit(child);
    }

    if (!isAttachmentLikePart(part)) return;

    const mimeType = contentTypeOf(part) || "application/octet-stream";
    const filename = sanitizeAttachmentFilename(
      part.filename || getHeader(part.headers, "Content-Type").split("name=")[1]?.replace(/"/g, "") || "attachment",
    );
    const size = Number(part.body?.size ?? 0);
    const attachmentId = part.body?.attachmentId ? String(part.body.attachmentId) : null;
    const embedded = Boolean(part.body?.data && !attachmentId);
    const partId = String(part.partId || "").trim() || `part-${results.length}`;

    if (!attachmentId && !embedded) return;

    results.push({
      partId,
      attachmentId,
      filename,
      mimeType,
      size: embedded && part.body?.data
        ? Math.max(size, Buffer.from(part.body.data, "base64").length)
        : size,
      disposition: dispositionOf(part),
      previewable: isPreviewableAttachmentMime(mimeType),
      embedded,
    });
  }

  visit(payload);
  return results;
}

export function findAttachmentOnMessage(
  attachments: ParsedGmailAttachmentMeta[],
  params: { attachmentId?: string | null; partId?: string | null },
): ParsedGmailAttachmentMeta | null {
  const attachmentId = params.attachmentId?.trim() || null;
  const partId = params.partId?.trim() || null;

  if (attachmentId) {
    const hit = attachments.find((a) => a.attachmentId === attachmentId);
    if (hit) return hit;
  }
  if (partId) {
    const hit = attachments.find((a) => a.partId === partId);
    if (hit) return hit;
  }
  return null;
}

function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  if (dot < 0) return "";
  return filename.slice(dot).toLowerCase();
}

export function isBlockedAttachmentFilename(filename: string): boolean {
  const ext = extensionOf(sanitizeAttachmentFilename(filename));
  return ext ? BLOCKED_EXTENSIONS.has(ext) : false;
}

export function isAllowedOutboundMime(mimeType: string): boolean {
  const mime = mimeType.toLowerCase().split(";")[0].trim();
  if (!mime || mime === "application/octet-stream") return false;
  if (ALLOWED_MIME_EXACT.has(mime)) return true;
  return ALLOWED_MIME_PREFIXES.some((prefix) => mime.startsWith(prefix));
}

function sniffMimeFromBytes(data: Buffer): string | null {
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    data.length >= 8 &&
    data[0] === 0x89 &&
    data[1] === 0x50 &&
    data[2] === 0x4e &&
    data[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    data.length >= 12 &&
    data.toString("ascii", 0, 4) === "RIFF" &&
    data.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  if (data.length >= 5 && data.toString("ascii", 0, 5) === "%PDF-") {
    return "application/pdf";
  }
  if (data.length >= 2 && data[0] === 0x42 && data[1] === 0x4d) {
    return "image/bmp";
  }
  return null;
}

export type OutboundAttachmentValidationResult =
  | { ok: true; attachment: OutboundMimeAttachment }
  | { ok: false; code: string; message: string };

export function validateOutboundAttachmentFile(params: {
  filename: string;
  mimeType: string;
  data: Buffer;
}): OutboundAttachmentValidationResult {
  const filename = sanitizeAttachmentFilename(params.filename);
  if (isBlockedAttachmentFilename(filename)) {
    return {
      ok: false,
      code: "gmail_attachment_type_blocked",
      message: `"${filename}" is not an allowed attachment type.`,
    };
  }

  if (!params.data.length) {
    return {
      ok: false,
      code: "gmail_attachment_empty",
      message: `"${filename}" is empty.`,
    };
  }

  if (params.data.length > GMAIL_ATTACHMENT_MAX_FILE_BYTES) {
    return {
      ok: false,
      code: "gmail_attachment_too_large",
      message: `"${filename}" exceeds the ${formatAttachmentByteSize(GMAIL_ATTACHMENT_MAX_FILE_BYTES)} per-file limit.`,
    };
  }

  const declared = params.mimeType.toLowerCase().split(";")[0].trim();
  const sniffed = sniffMimeFromBytes(params.data);
  const mimeType = sniffed || declared || "application/octet-stream";

  if (!isAllowedOutboundMime(mimeType)) {
    return {
      ok: false,
      code: "gmail_attachment_type_blocked",
      message: `"${filename}" is not an allowed attachment type.`,
    };
  }

  if (sniffed && declared && declared !== "application/octet-stream" && sniffed !== declared) {
    return {
      ok: false,
      code: "gmail_attachment_type_mismatch",
      message: `"${filename}" does not match its file contents.`,
    };
  }

  return {
    ok: true,
    attachment: { filename, mimeType, data: params.data },
  };
}

export function validateOutboundAttachmentBatch(
  files: OutboundMimeAttachment[],
): { ok: true; attachments: OutboundMimeAttachment[] } | { ok: false; code: string; message: string } {
  if (files.length > GMAIL_ATTACHMENT_MAX_FILES) {
    return {
      ok: false,
      code: "gmail_attachment_too_many",
      message: `You can attach up to ${GMAIL_ATTACHMENT_MAX_FILES} files per message.`,
    };
  }

  const total = files.reduce((sum, f) => sum + f.data.length, 0);
  if (total > GMAIL_ATTACHMENT_MAX_TOTAL_BYTES) {
    return {
      ok: false,
      code: "gmail_attachment_total_too_large",
      message: `Attachments exceed the ${formatAttachmentByteSize(GMAIL_ATTACHMENT_MAX_TOTAL_BYTES)} total limit.`,
    };
  }

  return { ok: true, attachments: files };
}

export function hashOutboundAttachments(attachments: OutboundMimeAttachment[]): string[] {
  return attachments.map((a) =>
    createHash("sha256").update(a.data).update("\0").update(a.filename).digest("hex"),
  );
}

function encodeRfc2047Filename(filename: string): string {
  if (/^[\x20-\x7E]*$/.test(filename)) return `filename="${filename}"`;
  return `filename*=UTF-8''${encodeURIComponent(filename).replace(/'/g, "%27")}`;
}

function randomBoundary(): string {
  return `ad8_${createHash("sha256").update(String(Math.random())).update(String(Date.now())).digest("hex").slice(0, 24)}`;
}

function wrapBase64Lines(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/(.{76})/g, "$1\r\n")
    .trim();
}

/**
 * Build multipart/mixed MIME with a plain-text body and optional attachments.
 */
export function buildMultipartMixedMime(params: {
  headers: string[];
  body: string;
  attachments?: OutboundMimeAttachment[];
}): string {
  const attachments = params.attachments || [];
  if (!attachments.length) {
    const bodyBase64 = Buffer.from(params.body, "utf8").toString("base64");
    const headers = [
      ...params.headers,
      `MIME-Version: 1.0`,
      `Content-Type: text/plain; charset="UTF-8"`,
      `Content-Transfer-Encoding: base64`,
    ];
    return `${headers.join("\r\n")}\r\n\r\n${bodyBase64}`;
  }

  const boundary = randomBoundary();
  const headers = [
    ...params.headers,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
  ];

  const parts: string[] = [];
  const textBase64 = Buffer.from(params.body, "utf8").toString("base64");
  parts.push(
    `--${boundary}\r\n` +
      `Content-Type: text/plain; charset="UTF-8"\r\n` +
      `Content-Transfer-Encoding: base64\r\n\r\n` +
      textBase64,
  );

  for (const file of attachments) {
    const encoded = wrapBase64Lines(file.data);
    parts.push(
      `--${boundary}\r\n` +
        `Content-Type: ${file.mimeType}; name="${file.filename.replace(/"/g, "")}"\r\n` +
        `Content-Disposition: attachment; ${encodeRfc2047Filename(file.filename)}\r\n` +
        `Content-Transfer-Encoding: base64\r\n\r\n` +
        encoded,
    );
  }

  parts.push(`--${boundary}--`);
  return `${headers.join("\r\n")}\r\n\r\n${parts.join("\r\n")}`;
}

export async function readOutboundAttachmentsFromFormData(
  formData: FormData,
): Promise<
  | { ok: true; attachments: OutboundMimeAttachment[] }
  | { ok: false; code: string; message: string }
> {
  const entries = formData.getAll("attachments");
  const files: OutboundMimeAttachment[] = [];

  for (const entry of entries) {
    if (!(entry instanceof File)) continue;
    const buffer = Buffer.from(await entry.arrayBuffer());
    const validated = validateOutboundAttachmentFile({
      filename: entry.name || "attachment",
      mimeType: entry.type || "application/octet-stream",
      data: buffer,
    });
    if (!validated.ok) return validated;
    files.push(validated.attachment);
  }

  const batch = validateOutboundAttachmentBatch(files);
  if (!batch.ok) return batch;
  return { ok: true, attachments: batch.attachments };
}
