import { NextResponse } from "next/server";
import type { ReviewMediaVariantName } from "@/lib/live-portfolio/review-data";
import { streamGalleryMediaBlob } from "@/lib/live-portfolio/serve-blob-media";
import { getSupabaseAdmin } from "@/lib/supabase/server";

/**
 * Public media proxy — only serves media belonging to published gallery items.
 * Does not alter Blob storage or Asset Engine processing.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
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
    .select(
      "id, gallery_item_id, blob_key, storage_pathname, variants, mime_type, media_type",
    )
    .eq("id", id)
    .maybeSingle();

  if (mediaError || !media) {
    return NextResponse.json({ error: "Media not found." }, { status: 404 });
  }

  const { data: item } = await supabase
    .from("gallery_items")
    .select("id, published")
    .eq("id", media.gallery_item_id)
    .maybeSingle();

  if (!item?.published) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  return streamGalleryMediaBlob(media, variant, "public, max-age=3600, stale-while-revalidate=86400");
}
