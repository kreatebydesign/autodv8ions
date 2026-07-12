import type {
  ParsedMonthFolder,
  ParsedVehicleFolder,
  ValidationWarning,
} from "./types";

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

/**
 * Parse a vehicle folder under a month folder.
 *
 * "26 ZR2" under 2026-07 → day 26, vehicle ZR2, work_date 2026-07-26
 * "2011 F250" → not a day; vehicle kept as "2011 F250"; work_date null
 * "Corvette" → vehicle Corvette; work_date null
 */
export function parseVehicleFolder(
  rawName: string,
  month: ParsedMonthFolder,
): ParsedVehicleFolder {
  const trimmed = (rawName || "").trim();
  const warnings: ValidationWarning[] = [...month.warnings];

  if (!trimmed) {
    return {
      rawName: trimmed,
      vehicle: "",
      day: null,
      workDate: null,
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
      provisionalVehicle: true,
      warnings,
    };
  }

  // 4-digit leading number (e.g. 2011 F250) is never treated as a day.
  const fourDigit = trimmed.match(/^(\d{4})(?:\s+|$)(.*)$/);
  if (fourDigit) {
    warnings.push(
      warn(
        "year_like_prefix",
        `Leading four-digit value "${fourDigit[1]}" was not treated as a day. Vehicle label preserved as-is.`,
      ),
    );
    return {
      rawName: trimmed,
      vehicle: trimmed,
      day: null,
      workDate: null,
      provisionalVehicle: true,
      warnings,
    };
  }

  // 1–2 digit day prefix only.
  const dayMatch = trimmed.match(/^(\d{1,2})(?:\s+)(.+)$/);
  if (!dayMatch) {
    // Bare number with no vehicle text, or no numeric prefix.
    const bareDay = trimmed.match(/^(\d{1,2})$/);
    if (bareDay) {
      const day = Number.parseInt(bareDay[1], 10);
      const maxDay = daysInMonth(month.year, month.month);
      if (day >= 1 && day <= maxDay) {
        warnings.push(
          warn(
            "vehicle_empty_after_day",
            `Folder "${trimmed}" looks like a day with no vehicle name.`,
          ),
        );
        return {
          rawName: trimmed,
          vehicle: "",
          day,
          workDate: `${month.year}-${pad2(month.month)}-${pad2(day)}`,
          provisionalVehicle: true,
          warnings,
        };
      }
    }

    warnings.push(
      warn(
        "no_day_prefix",
        `Folder "${trimmed}" has no valid day prefix; work_date left empty.`,
      ),
    );
    return {
      rawName: trimmed,
      vehicle: trimmed,
      day: null,
      workDate: null,
      provisionalVehicle: true,
      warnings,
    };
  }

  const day = Number.parseInt(dayMatch[1], 10);
  const remainder = dayMatch[2].trim();
  const maxDay = daysInMonth(month.year, month.month);

  if (day < 1 || day > maxDay) {
    warnings.push(
      warn(
        "day_impossible",
        `Day ${day} is not valid for ${month.year}-${pad2(month.month)}; not treated as a day. Vehicle label preserved as-is.`,
      ),
    );
    return {
      rawName: trimmed,
      vehicle: trimmed,
      day: null,
      workDate: null,
      provisionalVehicle: true,
      warnings,
    };
  }

  if (!remainder) {
    warnings.push(
      warn(
        "vehicle_empty_after_day",
        `Day ${day} was parsed but no vehicle label remained.`,
      ),
    );
    return {
      rawName: trimmed,
      vehicle: "",
      day,
      workDate: `${month.year}-${pad2(month.month)}-${pad2(day)}`,
      provisionalVehicle: true,
      warnings,
    };
  }

  return {
    rawName: trimmed,
    vehicle: remainder,
    day,
    workDate: `${month.year}-${pad2(month.month)}-${pad2(day)}`,
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
