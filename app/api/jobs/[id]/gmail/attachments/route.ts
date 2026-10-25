import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/require-admin";
import {
  authorizeGmailAttachmentAccess,
  fetchAuthorizedGmailAttachmentBytes,
} from "@/lib/google/gmail-attachment-access";
import { GmailIntegrationError } from "@/lib/google/gmail";
import { isPreviewableAttachmentMime, sanitizeAttachmentFilename } from "@/lib/google/gmail-attachments";
import { assertAdminForGmailReply } from "@/lib/google/gmail-reply-access";

type RouteContext = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

function attachmentErrorResponse(error: unknown) {
  if (error instanceof GmailIntegrationError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      {
        status: error.status,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, private",
        },
      },
    );
  }
  return NextResponse.json(
    { error: "Attachment is not available.", code: "gmail_attachment_unavailable" },
    {
      status: 502,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, private",
      },
    },
  );
}

export async function GET(request: Request, context: RouteContext) {
  const { email, error } = await requireAdminSession();
  const adminGate = assertAdminForGmailReply(email);
  if (!adminGate.ok) {
    return NextResponse.json(adminGate.response.body, {
      status: adminGate.response.status,
    });
  }
  if (error) return error;

  const { id: jobId } = await context.params;
  const url = new URL(request.url);
  const gmailMessageId = String(url.searchParams.get("messageId") || "").trim();
  const attachmentId = url.searchParams.get("attachmentId");
  const partId = url.searchParams.get("partId");
  const dispositionParam = url.searchParams.get("disposition") || "attachment";

  if (!gmailMessageId) {
    return NextResponse.json(
      { error: "Message ID is required.", code: "gmail_attachment_missing" },
      { status: 400 },
    );
  }

  try {
    const ctx = await authorizeGmailAttachmentAccess({
      jobId,
      gmailMessageId,
      attachmentId,
      partId,
    });

    const file = await fetchAuthorizedGmailAttachmentBytes(ctx);
    const filename = sanitizeAttachmentFilename(file.filename);
    const previewOk = isPreviewableAttachmentMime(file.mimeType);
    const disposition =
      dispositionParam === "inline" && previewOk ? "inline" : "attachment";

    const encodedName = encodeURIComponent(filename).replace(/'/g, "%27");

    return new NextResponse(new Uint8Array(file.data), {
      status: 200,
      headers: {
        "Content-Type": file.mimeType,
        "Content-Length": String(file.data.length),
        "Content-Disposition": `${disposition}; filename="${filename.replace(/"/g, "")}"; filename*=UTF-8''${encodedName}`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store, no-cache, must-revalidate, private",
      },
    });
  } catch (err) {
    return attachmentErrorResponse(err);
  }
}
