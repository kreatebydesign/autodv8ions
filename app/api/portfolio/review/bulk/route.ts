import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/require-admin";
import {
  BULK_REVIEW_MAX_ITEMS,
  runBulkReviewOperations,
  type BulkReviewAction,
} from "@/lib/live-portfolio/review-bulk";
import type { PublishEditorialFields } from "@/lib/live-portfolio/publish";

const ACTIONS: BulkReviewAction[] = [
  "publish",
  "archive",
  "pin",
  "unpin",
  "restore",
  "save",
  "analyze",
];

export async function POST(request: Request) {
  const { error } = await requireAdminSession();
  if (error) return error;

  let body: {
    ids?: string[];
    action?: BulkReviewAction;
    fields?: PublishEditorialFields;
    confirm?: boolean;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.action || !ACTIONS.includes(body.action)) {
    return NextResponse.json({ error: "Invalid bulk action." }, { status: 400 });
  }

  if (!body.ids?.length) {
    return NextResponse.json({ error: "ids are required." }, { status: 400 });
  }

  if (body.ids.length > BULK_REVIEW_MAX_ITEMS) {
    return NextResponse.json(
      {
        error: `Bulk actions are limited to ${BULK_REVIEW_MAX_ITEMS} projects per request.`,
      },
      { status: 400 },
    );
  }

  if (
    (body.action === "publish" || body.action === "archive") &&
    body.confirm !== true
  ) {
    return NextResponse.json(
      {
        error: `Set confirm: true to bulk ${body.action} selected projects.`,
      },
      { status: 400 },
    );
  }

  const result = await runBulkReviewOperations({
    ids: body.ids,
    action: body.action,
    fields: body.fields,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}
