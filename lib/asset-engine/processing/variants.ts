import type { AssetVariantName } from "../types";

export const IMAGE_VARIANT_MAX_EDGE: Record<AssetVariantName, number> = {
  thumbnail: 320,
  small: 640,
  medium: 1280,
  large: 1920,
};

export const IMAGE_VARIANT_ORDER: AssetVariantName[] = [
  "thumbnail",
  "small",
  "medium",
  "large",
];

export function isHeicMime(mimeType: string | null | undefined): boolean {
  const m = (mimeType || "").toLowerCase();
  return m === "image/heic" || m === "image/heif";
}

export function isImageMime(mimeType: string | null | undefined): boolean {
  const m = (mimeType || "").toLowerCase();
  return m.startsWith("image/");
}

export function isVideoMime(mimeType: string | null | undefined): boolean {
  const m = (mimeType || "").toLowerCase();
  return m.startsWith("video/");
}

/** Web-safe output for derivatives (originals may remain HEIC). */
export const DERIVED_IMAGE_MIME = "image/webp";
export const DERIVED_IMAGE_EXT = "webp";
