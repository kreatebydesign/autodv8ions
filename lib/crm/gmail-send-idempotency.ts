import { createHash } from "node:crypto";

export const GMAIL_SEND_DEDUPE_WINDOW_MS = 120_000;

export function buildGmailSendFingerprint(params: {
  jobId: string;
  threadId: string | null;
  subject: string;
  body: string;
  attachmentHashes?: string[];
}): string {
  const normalized = params.body.trim().replace(/\s+/g, " ");
  const attach =
    params.attachmentHashes && params.attachmentHashes.length
      ? params.attachmentHashes.slice().sort().join(",")
      : "";
  const payload = [
    params.jobId,
    params.threadId || "new",
    params.subject.trim().toLowerCase(),
    normalized,
    attach,
  ].join("\n");
  return createHash("sha256").update(payload, "utf8").digest("hex");
}

export function isRecentDuplicateGmailSend(params: {
  fingerprint: string;
  lastFingerprint: string | null;
  lastSentAtMs: number | null;
  nowMs?: number;
  windowMs?: number;
}): boolean {
  if (!params.lastFingerprint || params.lastFingerprint !== params.fingerprint) {
    return false;
  }
  if (params.lastSentAtMs == null) return false;
  const now = params.nowMs ?? Date.now();
  const windowMs = params.windowMs ?? GMAIL_SEND_DEDUPE_WINDOW_MS;
  return now - params.lastSentAtMs < windowMs;
}
