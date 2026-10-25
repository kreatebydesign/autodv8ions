import { getPrimaryJobGmailThreadLink } from "@/lib/crm/job-gmail-thread";
import { validateReplyThreadForJob } from "@/lib/crm/job-gmail-reply-guard";
import {
  extractAttachmentMetaFromPayload,
  findAttachmentOnMessage,
  GMAIL_ATTACHMENT_MAX_DOWNLOAD_BYTES,
  type ParsedGmailAttachmentMeta,
} from "@/lib/google/gmail-attachments";
import { GmailIntegrationError, getGmailClient } from "@/lib/google/gmail";
import { mapGmailApiError } from "@/lib/google/gmail-errors";
import type { gmail_v1 } from "googleapis";

function getGmailUserId() {
  return process.env.GOOGLE_GMAIL_USER?.trim() || "me";
}

export type AuthorizedAttachmentContext = {
  jobId: string;
  linkedThreadId: string;
  gmailMessageId: string;
  meta: ParsedGmailAttachmentMeta;
};

/**
 * Verify admin job link + message thread membership and resolve attachment metadata.
 */
export async function authorizeGmailAttachmentAccess(params: {
  jobId: string;
  gmailMessageId: string;
  attachmentId?: string | null;
  partId?: string | null;
}): Promise<AuthorizedAttachmentContext> {
  const gmailMessageId = params.gmailMessageId.trim();
  if (!gmailMessageId) {
    throw new GmailIntegrationError(
      "gmail_attachment_missing",
      "Attachment is not available.",
      404,
    );
  }

  const primaryLink = await getPrimaryJobGmailThreadLink(params.jobId);
  const threadGate = validateReplyThreadForJob({
    requestedThreadId: primaryLink?.gmail_thread_id || "",
    linkedThreadId: primaryLink?.gmail_thread_id || null,
  });
  if (!threadGate.ok) {
    throw new GmailIntegrationError(
      threadGate.code,
      "This attachment is not available for this job.",
      403,
    );
  }

  const linkedThreadId = primaryLink!.gmail_thread_id;

  let message: gmail_v1.Schema$Message;
  try {
    const gmail = await getGmailClient();
    const { data } = await gmail.users.messages.get({
      userId: getGmailUserId(),
      id: gmailMessageId,
      format: "full",
    });
    message = data;
  } catch (error) {
    throw mapGmailApiError(error, "gmail_attachment_unavailable", "Attachment is not available.");
  }

  const threadId = String(message.threadId || "").trim();
  if (threadId !== linkedThreadId) {
    throw new GmailIntegrationError(
      "gmail_thread_not_linked",
      "This attachment is not available for this job.",
      403,
    );
  }

  const attachments = extractAttachmentMetaFromPayload(message.payload);
  const meta = findAttachmentOnMessage(attachments, {
    attachmentId: params.attachmentId,
    partId: params.partId,
  });

  if (!meta) {
    throw new GmailIntegrationError(
      "gmail_attachment_missing",
      "Attachment is not available.",
      404,
    );
  }

  if (meta.size > GMAIL_ATTACHMENT_MAX_DOWNLOAD_BYTES) {
    throw new GmailIntegrationError(
      "gmail_attachment_too_large",
      "This attachment is too large to download here. Open the message in Gmail.",
      413,
    );
  }

  return {
    jobId: params.jobId,
    linkedThreadId,
    gmailMessageId,
    meta,
  };
}

export async function fetchAuthorizedGmailAttachmentBytes(
  ctx: AuthorizedAttachmentContext,
): Promise<{ data: Buffer; mimeType: string; filename: string }> {
  const { meta, gmailMessageId } = ctx;

  if (meta.embedded) {
    const gmail = await getGmailClient();
    const { data: message } = await gmail.users.messages.get({
      userId: getGmailUserId(),
      id: gmailMessageId,
      format: "full",
    });
    const attachments = extractAttachmentMetaFromPayload(message.payload);
    const fresh = findAttachmentOnMessage(attachments, {
      partId: meta.partId,
      attachmentId: meta.attachmentId,
    });
    if (!fresh?.embedded) {
      throw new GmailIntegrationError(
        "gmail_attachment_unavailable",
        "Attachment is not available.",
        404,
      );
    }
    const part = findPartById(message.payload, meta.partId);
    const raw = part?.body?.data;
    if (!raw) {
      throw new GmailIntegrationError(
        "gmail_attachment_unavailable",
        "Attachment is not available.",
        404,
      );
    }
    const normalized = raw.replace(/-/g, "+").replace(/_/g, "/");
    const pad = normalized.length % 4;
    const padded = pad ? normalized + "=".repeat(4 - pad) : normalized;
    const data = Buffer.from(padded, "base64");
    return { data, mimeType: meta.mimeType, filename: meta.filename };
  }

  if (!meta.attachmentId) {
    throw new GmailIntegrationError(
      "gmail_attachment_missing",
      "Attachment is not available.",
      404,
    );
  }

  try {
    const gmail = await getGmailClient();
    const { data } = await gmail.users.messages.attachments.get({
      userId: getGmailUserId(),
      messageId: gmailMessageId,
      id: meta.attachmentId,
    });
    const raw = String(data.data || "");
    if (!raw) {
      throw new GmailIntegrationError(
        "gmail_attachment_unavailable",
        "Attachment is not available.",
        404,
      );
    }
    const normalized = raw.replace(/-/g, "+").replace(/_/g, "/");
    const pad = normalized.length % 4;
    const padded = pad ? normalized + "=".repeat(4 - pad) : normalized;
    const dataBuf = Buffer.from(padded, "base64");
    if (dataBuf.length > GMAIL_ATTACHMENT_MAX_DOWNLOAD_BYTES) {
      throw new GmailIntegrationError(
        "gmail_attachment_too_large",
        "This attachment is too large to download here. Open the message in Gmail.",
        413,
      );
    }
    return { data: dataBuf, mimeType: meta.mimeType, filename: meta.filename };
  } catch (error) {
    if (error instanceof GmailIntegrationError) throw error;
    throw mapGmailApiError(error, "gmail_attachment_unavailable", "Attachment is not available.");
  }
}

function findPartById(
  payload: gmail_v1.Schema$MessagePart | null | undefined,
  partId: string,
): gmail_v1.Schema$MessagePart | null {
  if (!payload) return null;
  if (String(payload.partId || "") === partId) return payload;
  for (const child of payload.parts || []) {
    const hit = findPartById(child, partId);
    if (hit) return hit;
  }
  return null;
}
