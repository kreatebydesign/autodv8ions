import { createHash } from "node:crypto";

/** API JSON shape returned by POST /api/jobs/[id]/email */
export type JobEmailApiResponse = {
  success?: boolean;
  delivered?: boolean;
  logged?: boolean;
  duplicatePrevented?: boolean;
  resendMessageId?: string | null;
  warning?: string | null;
  error?: string;
  to?: string;
  customerName?: string | null;
};

export type OutboundLogResult =
  | { ok: true; id: string }
  | { ok: false; code: string; message: string };

export function normalizeOutboundBody(body: string): string {
  return body.trim().replace(/\s+/g, " ");
}

export function outboundContentFingerprint(
  subject: string,
  bodyText: string,
): string {
  const payload = `${subject.trim().toLowerCase()}\n${normalizeOutboundBody(bodyText)}`;
  return createHash("sha256").update(payload).digest("hex").slice(0, 32);
}

/**
 * Classify route outcome for UI + tests (does not perform I/O).
 */
export function classifyJobEmailSendOutcome(params: {
  sendFailed: boolean;
  sendErrorMessage?: string;
  resendMessageId?: string | null;
  logResult?: OutboundLogResult;
  duplicatePrevented?: boolean;
}): JobEmailApiResponse {
  if (params.duplicatePrevented) {
    return {
      success: true,
      delivered: true,
      logged: true,
      duplicatePrevented: true,
      resendMessageId: params.resendMessageId ?? null,
      warning: null,
    };
  }

  if (params.sendFailed) {
    return {
      success: false,
      delivered: false,
      logged: false,
      error: params.sendErrorMessage || "Email failed to send.",
    };
  }

  const messageId = params.resendMessageId ?? null;
  if (params.logResult?.ok) {
    return {
      success: true,
      delivered: true,
      logged: true,
      resendMessageId: messageId,
      warning: null,
    };
  }

  return {
    success: true,
    delivered: true,
    logged: false,
    resendMessageId: messageId,
    warning:
      "Email was sent, but it could not be saved to this job thread yet. Use “Save to thread” — do not send again.",
  };
}

export const OUTBOUND_LOG_FAILED_WARNING =
  "Email was sent, but it could not be saved to this job thread yet. Use “Save to thread” — do not send again.";
