export const NY_REPORTING_TIME_ZONE = "America/New_York";

export type NyMonthPeriodBounds = {
  /** e.g. "May 2024" */
  periodLabel: string;
  /** Inclusive start of calendar month in NY, as UTC ISO */
  periodStartIso: string;
  /** Exclusive end (start of next NY calendar month), as UTC ISO */
  periodEndIso: string;
  year: number;
  month: number;
};

function nyDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: NY_REPORTING_TIME_ZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hourCycle: "h23",
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value || 0);

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

/** Convert a NY local civil datetime to a UTC instant. */
export function nyLocalDateTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
): Date {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
  const offset = getNyOffsetMs(new Date(utcGuess));
  return new Date(utcGuess - offset);
}

function getNyOffsetMs(date: Date): number {
  const parts = nyDateParts(date);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return asUtc - date.getTime();
}

/** Calendar month in America/New_York containing `now`. */
export function getNyMonthPeriodBounds(now = new Date()): NyMonthPeriodBounds {
  const { year, month } = nyDateParts(now);
  const periodStart = nyLocalDateTimeToUtc(year, month, 1, 0, 0, 0);
  const nextMonth = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
  const periodEnd = nyLocalDateTimeToUtc(
    nextMonth.year,
    nextMonth.month,
    1,
    0,
    0,
    0,
  );

  const periodLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: NY_REPORTING_TIME_ZONE,
  }).format(periodStart);

  return {
    periodLabel,
    periodStartIso: periodStart.toISOString(),
    periodEndIso: periodEnd.toISOString(),
    year,
    month,
  };
}
