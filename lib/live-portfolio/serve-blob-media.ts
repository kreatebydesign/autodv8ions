import {
  resolveVercelBlobAuthOptions,
  toBlobSdkAuthFields,
} from "@/lib/asset-engine/storage/vercel-blob-auth";
import {
  resolveMediaPathname,
  type ReviewMediaVariantName,
} from "@/lib/live-portfolio/review-data";
import { get } from "@vercel/blob";
import { NextResponse } from "next/server";

type MediaRow = {
  blob_key?: string | null;
  storage_pathname?: string | null;
  variants?: unknown;
  mime_type?: string | null;
};

/**
 * Streams a private Blob object for portfolio presentation.
 * Does not mutate storage or Asset Engine state.
 */
export async function streamGalleryMediaBlob(
  media: MediaRow,
  variant: ReviewMediaVariantName,
  cacheControl: string,
): Promise<NextResponse> {
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
          result.blob.contentType ||
          media.mime_type ||
          "application/octet-stream",
        "Cache-Control": cacheControl,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    console.error(
      "[portfolio-media]",
      err instanceof Error ? err.message : "media proxy failed",
    );
    return NextResponse.json(
      { error: "Unable to load media." },
      { status: 502 },
    );
  }
}
