export default function JobStatusBadge({ status }: { status: string }) {
  const tone =
    status === "Completed"
      ? "text-green-400"
      : status === "Ready for Pickup"
        ? "text-yellow-300"
        : status === "Not Sold"
          ? "text-[var(--dv8-muted)]"
          : status === "Scheduled" || status === "In Shop"
            ? "text-[var(--dv8-red-bright)]"
            : "text-white";

  return (
    <span className={`text-xs uppercase tracking-[0.14em] ${tone}`}>
      {status}
    </span>
  );
}
