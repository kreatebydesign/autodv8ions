import { restoreGalleryItemToReview } from "@/lib/portfolio-engine/archive";
import { setGalleryItemPinned } from "@/lib/portfolio-engine/stats";
import { analyzeGalleryItemIntelligence } from "@/lib/portfolio-intelligence/batch";
import {
  updateGalleryPublishState,
  type PublishEditorialFields,
} from "@/lib/live-portfolio/publish";

export const BULK_REVIEW_MAX_ITEMS = 100;

export type BulkReviewAction =
  | "publish"
  | "archive"
  | "pin"
  | "unpin"
  | "restore"
  | "save"
  | "analyze";

export type BulkReviewItemResult = {
  id: string;
  ok: boolean;
  error?: string;
  archivedIds?: string[];
};

export type BulkReviewResult = {
  ok: true;
  action: BulkReviewAction;
  total: number;
  succeeded: number;
  failed: number;
  results: BulkReviewItemResult[];
};

function clampIds(ids: string[]) {
  const unique = [...new Set(ids.filter(Boolean))];
  return unique.slice(0, BULK_REVIEW_MAX_ITEMS);
}

export async function runBulkReviewOperations(input: {
  ids: string[];
  action: BulkReviewAction;
  fields?: PublishEditorialFields;
}): Promise<BulkReviewResult | { ok: false; error: string }> {
  const ids = clampIds(input.ids);
  if (ids.length === 0) {
    return { ok: false, error: "No project IDs provided." };
  }

  const results: BulkReviewItemResult[] = [];

  for (const id of ids) {
    if (input.action === "analyze") {
      const analyzed = await analyzeGalleryItemIntelligence(id);
      results.push({
        id,
        ok: analyzed.ok,
        error: analyzed.ok ? undefined : analyzed.error,
      });
      continue;
    }

    if (input.action === "pin" || input.action === "unpin") {
      const pinned = await setGalleryItemPinned(id, input.action === "pin");
      results.push({
        id,
        ok: pinned.ok,
        error: pinned.ok ? undefined : pinned.error,
      });
      continue;
    }

    if (input.action === "restore") {
      const restored = await restoreGalleryItemToReview(id);
      results.push({
        id,
        ok: restored.ok,
        error: restored.ok ? undefined : restored.error,
      });
      continue;
    }

    const publishAction =
      input.action === "publish"
        ? "publish"
        : input.action === "archive"
          ? "archive"
          : "save";

    const updated = await updateGalleryPublishState({
      id,
      action: publishAction,
      fields: input.fields,
    });

    results.push({
      id,
      ok: updated.ok,
      error: updated.ok ? undefined : updated.error,
      archivedIds: updated.ok ? updated.archivedIds : undefined,
    });
  }

  const succeeded = results.filter((row) => row.ok).length;

  return {
    ok: true,
    action: input.action,
    total: results.length,
    succeeded,
    failed: results.length - succeeded,
    results,
  };
}
