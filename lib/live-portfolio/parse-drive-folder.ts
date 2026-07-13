import type {
  ParsedMonthFolder,
  ParsedVehicleFolder,
  ValidationWarning,
} from "./types";
import {
  parseExplicitWorkDate,
  suggestWorkDateFromDriveTimestamp,
  looksLikeBareNumericPrefix,
} from "./work-date-parser";

function warn(code: string, message: string): ValidationWarning {
  return { code, message };
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/**
 * Parse a parent month folder such as:
 * - "2026-07 JULY"
 * - "2026-06 JUNE"
 * - "2026-2 FEB"   (single-digit month)
 * - "2026-04 APRIL"
 *
 * Accepts YYYY-M or YYYY-MM prefix. Does not invent months from prose alone.
 * Does not rename Drive folders.
 */
export function parseMonthFolder(rawName: string): ParsedMonthFolder {
  const trimmed = (rawName || "").trim();
  const warnings: ValidationWarning[] = [];

  if (!trimmed) {
    return {
      rawName: trimmed,
      ok: false,
      year: null,
      month: null,
      sortKey: null,
      warnings: [warn("month_empty", "Month folder name is empty.")],
    };
  }

  const match = trimmed.match(/^(\d{4})-(\d{1,2})\b/);
  if (!match) {
    return {
      rawName: trimmed,
      ok: false,
      year: null,
      month: null,
      sortKey: null,
      warnings: [
        warn(
          "month_unrecognized",
          `Month folder "${trimmed}" does not start with YYYY-M or YYYY-MM.`,
        ),
      ],
    };
  }

  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);

  if (month < 1 || month > 12) {
    return {
      rawName: trimmed,
      ok: false,
      year,
      month: null,
      sortKey: null,
      warnings: [
        warn(
          "month_invalid",
          `Month folder "${trimmed}" has invalid month ${match[2]}.`,
        ),
      ],
    };
  }

  if (year < 2000 || year > 2100) {
    warnings.push(
      warn(
        "month_year_unusual",
        `Month folder year ${year} is outside the expected range.`,
      ),
    );
  }

  return {
    rawName: trimmed,
    ok: true,
    year,
    month,
    sortKey: buildMonthSortKey(year, month),
    warnings,
  };
}

export function buildMonthSortKey(year: number, month: number): string {
  return `${year}-${pad2(month)}`;
}

export type ParseVehicleFolderOptions = {
  driveCreatedTime?: string | null;
  driveModifiedTime?: string | null;
  now?: Date;
};

/**
 * Parse a vehicle folder under a month folder.
 *
 * Explicit date patterns only (YYYY-MM-DD, MM-DD-YYYY, M-D, MM.DD.YY, YYYYMMDD).
 * Bare prefixes such as "26 Expedition" are preserved as vehicle labels and do not
 * become inferred calendar dates.
 */
export function parseVehicleFolder(
  rawName: string,
  month: ParsedMonthFolder,
  options: ParseVehicleFolderOptions = {},
): ParsedVehicleFolder {
  const trimmed = (rawName || "").trim();
  const warnings: ValidationWarning[] = [...month.warnings];
  const now = options.now ?? new Date();

  if (!trimmed) {
    return {
      rawName: trimmed,
      vehicle: "",
      day: null,
      workDate: null,
      suggestedWorkDate: null,
      dateConfidence: "none",
      provisionalVehicle: true,
      warnings: [
        ...warnings,
        warn("vehicle_empty", "Vehicle folder name is empty."),
      ],
    };
  }

  if (!month.ok || month.year == null || month.month == null) {
    warnings.push(
      warn(
        "month_unavailable",
        "Parent month folder could not be parsed; work_date left empty.",
      ),
    );
    return {
      rawName: trimmed,
      vehicle: trimmed,
      day: null,
      workDate: null,
      suggestedWorkDate: null,
      dateConfidence: "none",
      provisionalVehicle: true,
      warnings,
    };
  }

  const explicit = parseExplicitWorkDate(trimmed, month, now);
  warnings.push(...explicit.warnings);

  if (explicit.workDate) {
    const day = Number.parseInt(explicit.workDate.slice(8, 10), 10);
    return {
      rawName: trimmed,
      vehicle: explicit.vehicle,
      day,
      workDate: explicit.workDate,
      suggestedWorkDate: null,
      dateConfidence: explicit.confidence,
      provisionalVehicle: true,
      warnings,
    };
  }

  if (looksLikeBareNumericPrefix(trimmed)) {
    warnings.push(
      warn(
        "needs_date_confirmation",
        `Folder "${trimmed}" starts with a numeric prefix that may be a model year, not a confirmed install date.`,
      ),
    );
    return {
      rawName: trimmed,
      vehicle: trimmed,
      day: null,
      workDate: null,
      suggestedWorkDate:
        suggestWorkDateFromDriveTimestamp(
          options.driveCreatedTime || options.driveModifiedTime,
          month,
        ) || null,
      dateConfidence: "none",
      provisionalVehicle: true,
      warnings,
    };
  }

  warnings.push(
    warn(
      "no_explicit_date",
      `Folder "${trimmed}" has no explicit date pattern; work_date left empty.`,
    ),
  );

  return {
    rawName: trimmed,
    vehicle: trimmed,
    day: null,
    workDate: null,
    suggestedWorkDate:
      suggestWorkDateFromDriveTimestamp(
        options.driveCreatedTime || options.driveModifiedTime,
        month,
      ) || null,
    dateConfidence: "none",
    provisionalVehicle: true,
    warnings,
  };
}

export function composeProvisionalWorkDate(
  month: ParsedMonthFolder,
  day: number | null,
): string | null {
  if (!month.ok || month.year == null || month.month == null || day == null) {
    return null;
  }
  const maxDay = daysInMonth(month.year, month.month);
  if (day < 1 || day > maxDay) return null;
  return `${month.year}-${pad2(month.month)}-${pad2(day)}`;
}

export function normalizeProvisionalVehicleLabel(label: string): string {
  return (label || "").replace(/\s+/g, " ").trim();
}
