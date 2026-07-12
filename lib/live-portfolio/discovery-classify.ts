import type {
  DiscoveryIgnoreReason,
  DiscoveryMediaKind,
  IgnoredDiscoveryItem,
} from "./discovery-types";
import {
  DISCOVERY_SUPPORTED_IMAGE_MIMES,
  DISCOVERY_SUPPORTED_VIDEO_MIMES,
} from "./discovery-types";

function extensionFromName(name: string): string | null {
  const base = name.trim();
  const idx = base.lastIndexOf(".");
  if (idx <= 0 || idx === base.length - 1) return null;
  return base.slice(idx + 1).toLowerCase();
}

function isHiddenOrSystemName(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed) return true;
  if (trimmed.startsWith(".")) return true;
  if (trimmed.toLowerCase() === "thumbs.db") return true;
  if (trimmed.toLowerCase() === "desktop.ini") return true;
  if (trimmed.startsWith("~$")) return true;
  return false;
}

function isThumbnailLikeName(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    lower.includes("thumb") ||
    lower.includes(".thumbnail") ||
    lower.startsWith("._")
  );
}

export function classifyDiscoveryMedia(input: {
  id?: string | null;
  name?: string | null;
  mimeType?: string | null;
}):
  | {
      accepted: true;
      mediaKind: DiscoveryMediaKind;
      extension: string | null;
    }
  | {
      accepted: false;
      reason: DiscoveryIgnoreReason;
      detail: string;
    } {
  const id = input.id?.trim() || null;
  const name = (input.name || "").trim();
  const mime = (input.mimeType || "").trim().toLowerCase();

  if (!id) {
    return { accepted: false, reason: "missing_id", detail: "File is missing an id." };
  }
  if (!name) {
    return { accepted: false, reason: "empty_name", detail: "File name is empty." };
  }
  if (isHiddenOrSystemName(name)) {
    return {
      accepted: false,
      reason: "hidden_or_system",
      detail: `Ignored hidden/system file "${name}".`,
    };
  }
  if (isThumbnailLikeName(name)) {
    return {
      accepted: false,
      reason: "thumbnail_like",
      detail: `Ignored thumbnail-like file "${name}".`,
    };
  }

  if (mime.startsWith("application/vnd.google-apps.")) {
    return {
      accepted: false,
      reason: "google_workspace_file",
      detail: `Ignored Google Workspace file (${mime || "unknown"}).`,
    };
  }

  if (mime === "application/pdf" || name.toLowerCase().endsWith(".pdf")) {
    return { accepted: false, reason: "pdf", detail: `Ignored PDF "${name}".` };
  }

  if (
    mime.includes("zip") ||
    mime.includes("rar") ||
    mime.includes("7z") ||
    mime.includes("tar") ||
    mime.includes("gzip") ||
    /\.(zip|rar|7z|tar|gz)$/i.test(name)
  ) {
    return {
      accepted: false,
      reason: "archive",
      detail: `Ignored archive "${name}".`,
    };
  }

  if ((DISCOVERY_SUPPORTED_IMAGE_MIMES as readonly string[]).includes(mime)) {
    return {
      accepted: true,
      mediaKind: "image",
      extension: extensionFromName(name),
    };
  }

  if ((DISCOVERY_SUPPORTED_VIDEO_MIMES as readonly string[]).includes(mime)) {
    return {
      accepted: true,
      mediaKind: "video",
      extension: extensionFromName(name),
    };
  }

  return {
    accepted: false,
    reason: "unsupported_mime",
    detail: `Unsupported mime type "${mime || "(empty)"}" for "${name}".`,
  };
}

export function toIgnoredItem(input: {
  id?: string | null;
  name?: string | null;
  mimeType?: string | null;
  reason: DiscoveryIgnoreReason;
  detail?: string;
}): IgnoredDiscoveryItem {
  return {
    id: input.id || null,
    name: input.name || "",
    mimeType: input.mimeType || null,
    reason: input.reason,
    detail: input.detail,
  };
}

export function compareDiscoveryFilesNewestFirst(
  a: { createdTime?: string | null; modifiedTime?: string | null; name?: string | null },
  b: { createdTime?: string | null; modifiedTime?: string | null; name?: string | null },
): number {
  const aCreated = a.createdTime ? Date.parse(a.createdTime) : 0;
  const bCreated = b.createdTime ? Date.parse(b.createdTime) : 0;
  if (aCreated !== bCreated) return bCreated - aCreated;

  const aModified = a.modifiedTime ? Date.parse(a.modifiedTime) : 0;
  const bModified = b.modifiedTime ? Date.parse(b.modifiedTime) : 0;
  if (aModified !== bModified) return bModified - aModified;

  return (a.name || "").localeCompare(b.name || "", undefined, {
    sensitivity: "base",
    numeric: true,
  });
}
