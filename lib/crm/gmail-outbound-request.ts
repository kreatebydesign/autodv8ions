import {
  hashOutboundAttachments,
  readOutboundAttachmentsFromFormData,
  type OutboundMimeAttachment,
} from "@/lib/google/gmail-attachments";

export type ParsedGmailOutboundRequest =
  | {
      ok: true;
      attachments: OutboundMimeAttachment[];
      attachmentHashes: string[];
    }
  | { ok: false; code: string; message: string };

export async function parseGmailOutboundAttachmentsFromFormData(
  formData: FormData,
): Promise<ParsedGmailOutboundRequest> {
  const parsed = await readOutboundAttachmentsFromFormData(formData);
  if (!parsed.ok) return parsed;

  return {
    ok: true,
    attachments: parsed.attachments,
    attachmentHashes: hashOutboundAttachments(parsed.attachments),
  };
}

export async function parseGmailOutboundAttachments(
  request: Request,
): Promise<ParsedGmailOutboundRequest> {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return { ok: true, attachments: [], attachmentHashes: [] };
  }

  try {
    const formData = await request.formData();
    return parseGmailOutboundAttachmentsFromFormData(formData);
  } catch {
    return {
      ok: false,
      code: "gmail_attachment_invalid",
      message: "Could not read attachment upload.",
    };
  }
}

export async function readGmailMultipartFields(
  request: Request,
): Promise<
  | { ok: true; formData: FormData }
  | { ok: false; code: string; message: string }
> {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return { ok: false, code: "invalid_request", message: "Expected multipart form." };
  }
  try {
    return { ok: true, formData: await request.formData() };
  } catch {
    return {
      ok: false,
      code: "gmail_attachment_invalid",
      message: "Could not read upload.",
    };
  }
}
