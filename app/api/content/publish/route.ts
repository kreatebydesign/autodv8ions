import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/require-admin";
import {
  updateGalleryPublishState,
  type PublishAction,
  type PublishEditorialFields,
} from "@/lib/live-portfolio/publish";

/**
 * Admin publish / unpublish / save for Review Workspace.
 * Updates gallery_items review state only — no Drive, Blob, or Asset Engine changes.
 */
export async function POST(request: Request) {
  const { error } = await requireAdminSession();
  if (error) return error;

  let body: {
    id?: string;
    action?: PublishAction;
    fields?: PublishEditorialFields;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.id || !body.action) {
    return NextResponse.json(
      { error: "id and action are required." },
      { status: 400 },
    );
  }

  if (!["publish", "unpublish", "save", "archive"].includes(body.action)) {
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  }

  const result = await updateGalleryPublishState({
    id: body.id,
    action: body.action,
    fields: body.fields,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    published: result.published,
    action: body.action,
    archivedIds: result.archivedIds || [],
  });
}
