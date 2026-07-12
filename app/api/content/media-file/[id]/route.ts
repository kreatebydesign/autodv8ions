import { get } from "@vercel/blob";
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/require-admin";
import {
  resolveVercelBlobAuthOptions,
  toBlobSdkAuthFields,
} from "@/lib/asset-engine/storage/vercel-blob-auth";
import {
  resolveMediaPathname,
  type ReviewMediaVariantName,
} from "@/lib/live-portfolio/review-data";
import { getSupabaseAdmin } from "@/lib/supabase/server";

/**
 * Admin-only private media proxy for Review Workspace presentation.
 * Does not publish. Does not alter Asset Engine processing.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const { id } = await context.params;
  const { searchParams } = new URL(request.url);
  const variant = (searchParams.get("variant") ||
    "medium") as ReviewMediaVariantName;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: "Database unavailable." },
      { status: 503 },
    );
  }

  const { data: media, error: mediaError } = await supabase
    .from("gallery_media")
    .select("id, blob_key, storage_pathname, variants, mime_type, media_type")
    .eq("id", id)
    .maybeSingle();

  if (mediaError || !media) {
    return NextResponse.json({ error: "Media not found." }, { status: 404 });
  }

  const pathname = resolveMediaPathname(media, variant);
  if (!pathname) {
    return NextResponse.json(
      { error: "Media file is not available in private storage yet." },
      { status: 404 },
    );
  }

  try {
    const auth = await resolveVercelBlobAuthOptions();
    const authFields = toBlobSdkAuthFields(auth);
    const result = await get(pathname, {
      access: "private",
      ...authFields,
    });

    if (!result || result.statusCode !== 200 || !result.stream) {
      return NextResponse.json(
        { error: "Blob object not found." },
        { status: 404 },
      );
    }

    return new NextResponse(result.stream, {
      headers: {
        "Content-Type":
          result.blob.contentType || media.mime_type || "application/octet-stream",
        "Cache-Control": "private, max-age=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    console.error(
      "[review-media]",
      err instanceof Error ? err.message : "media proxy failed",
    );
    return NextResponse.json(
      { error: "Unable to load private media." },
      { status: 502 },
    );
  }
}
