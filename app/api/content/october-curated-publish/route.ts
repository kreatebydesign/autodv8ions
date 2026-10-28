import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { publishCuratedOctober2026 } from "@/lib/content/october-curated-publish";

/**
 * Admin-only: publish curated October 2026 tint jobs (5–8 strongest when ready).
 */
export async function POST(request: Request) {
  const { error } = await requireAdminSession();
  if (error) return error;

  let body: { confirmCuratedPublish?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  if (body.confirmCuratedPublish !== true) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "confirmation_required",
          message:
            'Requires { "confirmCuratedPublish": true } to publish curated October work.',
        },
      },
      { status: 400 },
    );
  }

  try {
    const result = await publishCuratedOctober2026();
    return NextResponse.json(result, { status: result.ok ? 200 : 502 });
  } catch (err) {
    console.error("[content/october-curated-publish]", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Publish failed.",
      },
      { status: 500 },
    );
  }
}
