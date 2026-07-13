import {
  parseExplicitWorkDate,
  looksLikeLegacyDayInference,
  isFutureWorkDate,
} from "./work-date-parser";
import { parseMonthFolder } from "./parse-drive-folder";
import type { ValidationWarning } from "./types";

export type WorkDateRepairCandidate = {
  id: string;
  work_date: string | null;
  provisional_vehicle: boolean | null;
  drive_folder_name: string | null;
  source_month_folder_name: string | null;
  validation_errors: ValidationWarning[] | null;
};

export type WorkDateRepairPreview = {
  id: string;
  previousWorkDate: string | null;
  nextWorkDate: string | null;
  reason: string;
  skipped: boolean;
  skipReason?: string;
};

function warn(code: string, message: string): ValidationWarning {
  return { code, message };
}

function mergeWarnings(
  existing: ValidationWarning[] | null | undefined,
  incoming: ValidationWarning[],
): ValidationWarning[] {
  const list = Array.isArray(existing) ? [...existing] : [];
  for (const next of incoming) {
    if (!list.some((w) => w.code === next.code)) list.push(next);
  }
  return list;
}

export function isHumanConfirmedWorkDate(item: WorkDateRepairCandidate): boolean {
  return item.provisional_vehicle === false;
}

export function shouldRepairProvisionalWorkDate(
  item: WorkDateRepairCandidate,
  now: Date = new Date(),
): { repair: boolean; reason: string } {
  if (isHumanConfirmedWorkDate(item)) {
    return { repair: false, reason: "human_confirmed" };
  }

  if (!item.work_date) {
    return { repair: false, reason: "no_work_date" };
  }

  if (
    looksLikeLegacyDayInference(
      item.drive_folder_name,
      item.work_date,
      item.source_month_folder_name,
    )
  ) {
    return {
      repair: true,
      reason: "legacy_day_prefix_inference",
    };
  }

  if (isFutureWorkDate(item.work_date, now)) {
    const month = parseMonthFolder(item.source_month_folder_name || "");
    const explicit = parseExplicitWorkDate(
      item.drive_folder_name || "",
      month,
      now,
    );
    if (!explicit.workDate || explicit.workDate !== item.work_date) {
      return {
        repair: true,
        reason: "future_date_without_explicit_pattern",
      };
    }
  }

  const month = parseMonthFolder(item.source_month_folder_name || "");
  const reparsed = parseExplicitWorkDate(
    item.drive_folder_name || "",
    month,
    now,
  );
  if (item.work_date && !reparsed.workDate) {
    return { repair: true, reason: "unconfirmed_parser_date" };
  }

  return { repair: false, reason: "looks_valid" };
}

export function buildWorkDateRepairPatch(
  item: WorkDateRepairCandidate,
  now: Date = new Date(),
): WorkDateRepairPreview {
  const decision = shouldRepairProvisionalWorkDate(item, now);
  if (!decision.repair) {
    return {
      id: item.id,
      previousWorkDate: item.work_date,
      nextWorkDate: item.work_date,
      reason: decision.reason,
      skipped: true,
      skipReason: decision.reason,
    };
  }

  return {
    id: item.id,
    previousWorkDate: item.work_date,
    nextWorkDate: null,
    reason: decision.reason,
    skipped: false,
  };
}

export function buildWorkDateRepairRow(
  item: WorkDateRepairCandidate,
  now: Date = new Date(),
): {
  work_date: string | null;
  validation_errors: ValidationWarning[];
} | null {
  const preview = buildWorkDateRepairPatch(item, now);
  if (preview.skipped) return null;

  return {
    work_date: null,
    validation_errors: mergeWarnings(item.validation_errors, [
      warn(
        "needs_date_confirmation",
        "Needs date confirmation. A provisional folder prefix was not treated as a confirmed install date.",
      ),
    ]),
  };
}
