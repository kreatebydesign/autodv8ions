import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getNyMonthPeriodBounds } from "@/lib/utils/ny-month-period";

export type InquiryBucket = "Window Tint" | "Remote Starters" | "Vehicle Security" | "Other";

export type MonthlyServiceSnapshot = {
  periodLabel: string;
  periodStartIso: string;
  periodEndIso: string;
  inquiries: Record<InquiryBucket, number>;
  jobsCreated: number;
  jobsCompleted: number;
  websiteLeadsCreated: number;
  websiteLeadsProgressed: number;
  conversionNote: string;
};

const WEBSITE_SOURCES = ["website_inquiry", "website_quote"] as const;

function mapServiceToInquiryBucket(serviceType: string | null): InquiryBucket {
  const s = String(serviceType || "").toLowerCase();
  if (s.includes("tint")) return "Window Tint";
  if (s.includes("remote") || s.includes("starter")) return "Remote Starters";
  if (s.includes("alarm") || s.includes("security")) return "Vehicle Security";
  return "Other";
}

const PROGRESS_STATUSES = new Set([
  "Contacted",
  "Scheduled",
  "In Shop",
  "Ready for Pickup",
  "Completed",
]);

export async function getMonthlyServiceSnapshot(
  now = new Date(),
): Promise<MonthlyServiceSnapshot> {
  const { periodLabel, periodStartIso, periodEndIso } = getNyMonthPeriodBounds(now);

  const empty: MonthlyServiceSnapshot = {
    periodLabel,
    periodStartIso,
    periodEndIso,
    inquiries: {
      "Window Tint": 0,
      "Remote Starters": 0,
      "Vehicle Security": 0,
      Other: 0,
    },
    jobsCreated: 0,
    jobsCompleted: 0,
    websiteLeadsCreated: 0,
    websiteLeadsProgressed: 0,
    conversionNote:
      "Follow-through rate is website-sourced jobs created this month whose status is past New or Not Sold. It does not measure marketing ROI or prove which channel closed the sale.",
  };

  const supabase = getSupabaseAdmin();
  if (!supabase) return empty;

  const { data: createdRows, error: createdError } = await supabase
    .from("jobs")
    .select("id, service_type, status, source, created_at, completed_at")
    .is("archived_at", null)
    .gte("created_at", periodStartIso)
    .lt("created_at", periodEndIso);

  if (createdError) {
    console.error("[crm/monthly-snapshot] query error:", createdError);
    return empty;
  }

  const rows = createdRows || [];
  const inquiries = { ...empty.inquiries };
  let websiteLeadsCreated = 0;
  let websiteLeadsProgressed = 0;

  for (const row of rows) {
    const source = String(row.source || "");
    if (WEBSITE_SOURCES.includes(source as (typeof WEBSITE_SOURCES)[number])) {
      websiteLeadsCreated += 1;
      const bucket = mapServiceToInquiryBucket(row.service_type);
      inquiries[bucket] += 1;
      if (PROGRESS_STATUSES.has(String(row.status || ""))) {
        websiteLeadsProgressed += 1;
      }
    }
  }

  const jobsCreated = rows.length;

  const { count: completedCount } = await supabase
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .is("archived_at", null)
    .eq("status", "Completed")
    .gte("completed_at", periodStartIso)
    .lt("completed_at", periodEndIso);

  const jobsCompleted = completedCount || 0;

  return {
    periodLabel,
    periodStartIso,
    periodEndIso,
    inquiries,
    jobsCreated,
    jobsCompleted,
    websiteLeadsCreated,
    websiteLeadsProgressed,
    conversionNote: empty.conversionNote,
  };
}
