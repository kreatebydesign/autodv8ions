import { getSupabaseAdmin } from "@/lib/supabase/server";
import {
  buildWorkDateRepairPatch,
  buildWorkDateRepairRow,
  type WorkDateRepairCandidate,
} from "@/lib/live-portfolio/work-date-repair";

export async function previewWorkDateRepairs(limit = 200) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false as const, error: "Database unavailable." };

  const { data, error } = await supabase
    .from("gallery_items")
    .select(
      "id, work_date, provisional_vehicle, drive_folder_name, source_month_folder_name, validation_errors",
    )
    .not("work_date", "is", null)
    .limit(limit);

  if (error) return { ok: false as const, error: error.message };

  const rows = (data || [])
    .map((row) => {
      const preview = buildWorkDateRepairPatch(row as WorkDateRepairCandidate);
      if (preview.skipped) return null;
      return preview;
    })
    .filter(Boolean);

  return {
    ok: true as const,
    repairCount: rows.length,
    rows,
  };
}

export async function executeWorkDateRepairs(input?: {
  confirm?: boolean;
  limit?: number;
}) {
  if (!input?.confirm) {
    return {
      ok: false as const,
      error: "Set confirm: true to repair provisional work dates.",
    };
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false as const, error: "Database unavailable." };

  const limit = input.limit || 200;
  const { data, error } = await supabase
    .from("gallery_items")
    .select(
      "id, work_date, provisional_vehicle, drive_folder_name, source_month_folder_name, validation_errors",
    )
    .not("work_date", "is", null)
    .limit(limit);

  if (error) return { ok: false as const, error: error.message };

  let repaired = 0;
  const repairedIds: string[] = [];

  for (const row of data || []) {
    const patch = buildWorkDateRepairRow(row as WorkDateRepairCandidate);
    if (!patch) continue;

    const { error: updateError } = await supabase
      .from("gallery_items")
      .update({
        work_date: patch.work_date,
        validation_errors: patch.validation_errors,
      })
      .eq("id", row.id)
      .eq("provisional_vehicle", true);

    if (!updateError) {
      repaired += 1;
      repairedIds.push(row.id);
    }
  }

  return { ok: true as const, repaired, repairedIds };
}
