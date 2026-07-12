import sharp from "sharp";
import { sha256Buffer } from "../checksum";
import type { AssetVariantName, AssetVariantRecord } from "../types";
import {
  DERIVED_IMAGE_EXT,
  DERIVED_IMAGE_MIME,
  IMAGE_VARIANT_MAX_EDGE,
  IMAGE_VARIANT_ORDER,
  isHeicMime,
} from "./variants";

export type ImageProcessOutput = {
  width: number;
  height: number;
  originalMimeType: string;
  derivedMimeType: string;
  /** Web-safe full-resolution buffer when HEIC/HEIF was converted. */
  webSafeOriginal: Buffer | null;
  variants: Array<{
    name: AssetVariantName;
    buffer: Buffer;
    width: number;
    height: number;
    mimeType: string;
    checksumSha256: string;
  }>;
};

/**
 * Process an image buffer into aspect-preserving variants.
 * Never mutates/overwrites the caller’s original Buffer.
 * HEIC/HEIF → also produces a web-safe master derivative.
 */
export async function processImageBuffer(
  input: Buffer,
  options: { mimeType: string },
): Promise<ImageProcessOutput> {
  const pipeline = sharp(input, { failOn: "none" }).rotate();
  const meta = await pipeline.metadata();
  const width = meta.width || 0;
  const height = meta.height || 0;

  if (!width || !height) {
    throw new Error("Unable to read image dimensions.");
  }

  const needsHeicConversion = isHeicMime(options.mimeType);
  let webSafeOriginal: Buffer | null = null;
  let derivedMimeType = options.mimeType;

  if (needsHeicConversion) {
    webSafeOriginal = await sharp(input, { failOn: "none" })
      .rotate()
      .webp({ quality: 90 })
      .toBuffer();
    derivedMimeType = DERIVED_IMAGE_MIME;
  }

  const sourceForVariants = webSafeOriginal || input;
  const variants: ImageProcessOutput["variants"] = [];

  for (const name of IMAGE_VARIANT_ORDER) {
    const maxEdge = IMAGE_VARIANT_MAX_EDGE[name];
    const resized = await sharp(sourceForVariants, { failOn: "none" })
      .rotate()
      .resize({
        width: maxEdge,
        height: maxEdge,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: name === "thumbnail" ? 75 : 82 })
      .toBuffer({ resolveWithObject: true });

    variants.push({
      name,
      buffer: resized.data,
      width: resized.info.width,
      height: resized.info.height,
      mimeType: DERIVED_IMAGE_MIME,
      checksumSha256: sha256Buffer(resized.data),
    });
  }

  return {
    width,
    height,
    originalMimeType: options.mimeType,
    derivedMimeType,
    webSafeOriginal,
    variants,
  };
}

export function buildVariantRecord(
  name: AssetVariantName,
  pathname: string,
  variant: ImageProcessOutput["variants"][number],
): AssetVariantRecord {
  return {
    key: pathname,
    pathname,
    bytes: variant.buffer.byteLength,
    width: variant.width,
    height: variant.height,
    mimeType: variant.mimeType,
    checksum: variant.checksumSha256,
  };
}

export function variantPathname(
  basePath: string,
  name: AssetVariantName,
): string {
  return `${basePath}/variants/${name}.${DERIVED_IMAGE_EXT}`;
}

export function webSafeMasterPathname(basePath: string): string {
  return `${basePath}/derived/master.${DERIVED_IMAGE_EXT}`;
}
