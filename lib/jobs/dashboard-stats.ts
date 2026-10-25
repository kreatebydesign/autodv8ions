import { getNyMonthPeriodBounds } from "@/lib/utils/ny-month-period";

/** Completed-at filter for the dashboard "Completed This Month" KPI (America/New_York). */
export function getCompletedThisMonthBounds(now = new Date()) {
  const { periodStartIso, periodEndIso } = getNyMonthPeriodBounds(now);
  return { periodStartIso, periodEndIso };
}
