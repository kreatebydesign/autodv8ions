export default function JobStatusBadge({ status }: { status: string }) {
  const toneClass =
    status === "Completed"
      ? "is-complete"
      : status === "Ready for Pickup"
        ? "is-ready"
        : status === "Not Sold"
          ? "is-muted"
          : status === "Scheduled" || status === "In Shop"
            ? "is-active"
            : "";

  return (
    <span className={`dash-status${toneClass ? ` ${toneClass}` : ""}`}>
      {status}
    </span>
  );
}
