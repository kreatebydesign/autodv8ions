/**
 * Maps Jobs admin status filter values to stored statuses to include.
 * Contacted includes Scheduled so Chris's working "already contacted" group
 * stays together, while Scheduled remains the stored/displayed status.
 */
export function statusesMatchingFilter(
  statusFilter: string | null | undefined,
): string[] | null {
  const status = statusFilter?.trim();
  if (!status) return null;
  if (status === "Contacted") return ["Contacted", "Scheduled"];
  return [status];
}
