import type {
  ParsedMonthFolder,
  ValidationWarning,
} from "./types";

export type WorkDateConfidence = "confirmed" | "provisional" | "none";

export type ExplicitWorkDateResult = {
  workDate: string | null;
  vehicle: string;
  confidence: WorkDateConfidence;
  pattern: string | null;
  warnings: ValidationWarning[];
};

function warn(code: string, message: string): ValidationWarning {
  return { code, message };
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function isValidCalendarDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1) return false;
  return day <= daysInMonth(year, month);
}

function toIsoDate(year: number, month: number, day: number): string | null {
  if (!isValidCalendarDate(year, month, day)) return null;
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function expandTwoDigitYear(twoDigit: number, referenceYear?: number | null): number {
  const ref = referenceYear ?? new Date().getUTCFullYear();
  const century = Math.floor(ref / 100) * 100;
  const candidate = century + twoDigit;
  if (candidate > ref + 10) return candidate - 100;
  return candidate;
}

export function isFutureWorkDate(
  workDate: string,
  now: Date = new Date(),
): boolean {
  const today = now.toISOString().slice(0, 10);
  return workDate > today;
}

export function suggestWorkDateFromDriveTimestamp(
  isoTimestamp: string | null | undefined,
  month?: ParsedMonthFolder,
): string | null {
  if (!isoTimestamp) return null;
  const parsed = isoTimestamp.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(parsed)) return null;

  if (month?.ok && month.year != null && month.month != null) {
    const [year, mon] = parsed.split("-").map(Number);
    if (year === month.year && mon === month.month) {
      return parsed;
    }
  }

  return parsed;
}

/**
 * Parse only explicit date patterns from a job folder name.
 * Bare numeric prefixes (e.g. "26 Expedition") are intentionally not treated as days.
 */
export function parseExplicitWorkDate(
  rawName: string,
  month: ParsedMonthFolder,
  now: Date = new Date(),
): ExplicitWorkDateResult {
  const trimmed = (rawName || "").trim();
  const warnings: ValidationWarning[] = [];
  const monthYear = month.ok ? month.year : null;
  const monthNum = month.ok ? month.month : null;

  if (!trimmed) {
    return {
      workDate: null,
      vehicle: "",
      confidence: "none",
      pattern: null,
      warnings: [warn("vehicle_empty", "Vehicle folder name is empty.")],
    };
  }

  // YYYY-MM-DD [vehicle]
  const isoPrefix = trimmed.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})(?:\s+(.+))?$/,
  );
  if (isoPrefix) {
    const year = Number.parseInt(isoPrefix[1], 10);
    const mon = Number.parseInt(isoPrefix[2], 10);
    const day = Number.parseInt(isoPrefix[3], 10);
    const workDate = toIsoDate(year, mon, day);
    if (!workDate) {
      warnings.push(
        warn(
          "date_invalid",
          `Folder "${trimmed}" contains an invalid YYYY-MM-DD date.`,
        ),
      );
      return {
        workDate: null,
        vehicle: trimmed,
        confidence: "none",
        pattern: "YYYY-MM-DD",
        warnings,
      };
    }
    return {
      workDate,
      vehicle: (isoPrefix[4] || "").trim() || trimmed,
      confidence: "confirmed",
      pattern: "YYYY-MM-DD",
      warnings,
    };
  }

  // MM-DD-YYYY [vehicle]
  const usFull = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{4})(?:\s+(.+))?$/);
  if (usFull) {
    const mon = Number.parseInt(usFull[1], 10);
    const day = Number.parseInt(usFull[2], 10);
    const year = Number.parseInt(usFull[3], 10);
    const workDate = toIsoDate(year, mon, day);
    if (!workDate) {
      warnings.push(
        warn(
          "date_invalid",
          `Folder "${trimmed}" contains an invalid MM-DD-YYYY date.`,
        ),
      );
      return {
        workDate: null,
        vehicle: trimmed,
        confidence: "none",
        pattern: "MM-DD-YYYY",
        warnings,
      };
    }
    return {
      workDate,
      vehicle: (usFull[4] || "").trim() || trimmed,
      confidence: "confirmed",
      pattern: "MM-DD-YYYY",
      warnings,
    };
  }

  // YYYYMMDD [vehicle]
  const compact = trimmed.match(/^(\d{4})(\d{2})(\d{2})(?:\s+(.+))?$/);
  if (compact) {
    const year = Number.parseInt(compact[1], 10);
    const mon = Number.parseInt(compact[2], 10);
    const day = Number.parseInt(compact[3], 10);
    const workDate = toIsoDate(year, mon, day);
    if (!workDate) {
      warnings.push(
        warn(
          "date_invalid",
          `Folder "${trimmed}" contains an invalid YYYYMMDD date.`,
        ),
      );
      return {
        workDate: null,
        vehicle: trimmed,
        confidence: "none",
        pattern: "YYYYMMDD",
        warnings,
      };
    }
    return {
      workDate,
      vehicle: (compact[4] || "").trim() || trimmed,
      confidence: "confirmed",
      pattern: "YYYYMMDD",
      warnings,
    };
  }

  // MM.DD.YY [vehicle]
  const dotted = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2})(?:\s+(.+))?$/);
  if (dotted) {
    const mon = Number.parseInt(dotted[1], 10);
    const day = Number.parseInt(dotted[2], 10);
    const year = expandTwoDigitYear(Number.parseInt(dotted[3], 10), monthYear);
    const workDate = toIsoDate(year, mon, day);
    if (!workDate) {
      warnings.push(
        warn(
          "date_invalid",
          `Folder "${trimmed}" contains an invalid MM.DD.YY date.`,
        ),
      );
      return {
        workDate: null,
        vehicle: trimmed,
        confidence: "none",
        pattern: "MM.DD.YY",
        warnings,
      };
    }
    return {
      workDate,
      vehicle: (dotted[4] || "").trim() || trimmed,
      confidence: "confirmed",
      pattern: "MM.DD.YY",
      warnings,
    };
  }

  // M-D or MM-DD [vehicle] — explicit separator, year from month folder when available
  const shortMd = trimmed.match(/^(\d{1,2})[-/](\d{1,2})(?:\s+(.+))?$/);
  if (shortMd && monthYear != null && monthNum != null) {
    const mon = Number.parseInt(shortMd[1], 10);
    const day = Number.parseInt(shortMd[2], 10);
    const workDate = toIsoDate(monthYear, mon, day);
    if (!workDate) {
      warnings.push(
        warn(
          "date_invalid",
          `Folder "${trimmed}" contains an invalid M-D date for ${monthYear}.`,
        ),
      );
      return {
        workDate: null,
        vehicle: trimmed,
        confidence: "none",
        pattern: "M-D",
        warnings,
      };
    }
    if (isFutureWorkDate(workDate, now)) {
      return {
        workDate,
        vehicle: (shortMd[3] || "").trim() || trimmed,
        confidence: "confirmed",
        pattern: "M-D",
        warnings,
      };
    }
    return {
      workDate,
      vehicle: (shortMd[3] || "").trim() || trimmed,
      confidence: "confirmed",
      pattern: "M-D",
      warnings,
    };
  }

  return {
    workDate: null,
    vehicle: trimmed,
    confidence: "none",
    pattern: null,
    warnings,
  };
}

export function looksLikeBareNumericPrefix(rawName: string): boolean {
  const trimmed = (rawName || "").trim();
  if (!trimmed) return false;
  if (/^\d{4}(?:\s+|$)/.test(trimmed)) return true;
  return /^(\d{1,2})(?:\s+)(.+)$/.test(trimmed);
}

export function looksLikeLegacyDayInference(
  driveFolderName: string | null,
  workDate: string | null,
  sourceMonthFolderName: string | null,
): boolean {
  if (!driveFolderName || !workDate || !sourceMonthFolderName) return false;

  const dayMatch = driveFolderName.trim().match(/^(\d{1,2})(?:\s+)(.+)$/);
  if (!dayMatch) return false;

  const year = Number.parseInt(workDate.slice(0, 4), 10);
  const month = Number.parseInt(workDate.slice(5, 7), 10);
  const day = Number.parseInt(dayMatch[1], 10);
  const inferred = `${year}-${pad2(month)}-${pad2(day)}`;
  return inferred === workDate;
}
