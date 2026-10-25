import type { MonthlyServiceSnapshot } from "@/lib/crm/monthly-snapshot";

export default function MonthlyServiceSnapshotPanel({
  snapshot,
}: {
  snapshot: MonthlyServiceSnapshot;
}) {
  const conversionPct =
    snapshot.websiteLeadsCreated > 0
      ? Math.round(
          (snapshot.websiteLeadsProgressed / snapshot.websiteLeadsCreated) *
            100,
        )
      : null;

  const inquiryRows = [
    { label: "Window Tint", value: snapshot.inquiries["Window Tint"] },
    { label: "Remote Starters", value: snapshot.inquiries["Remote Starters"] },
    { label: "Vehicle Security", value: snapshot.inquiries["Vehicle Security"] },
    { label: "Other", value: snapshot.inquiries.Other },
  ] as const;

  return (
    <section
      className="dash-panel is-secondary dash-snapshot"
      aria-labelledby="monthly-snapshot-heading"
    >
      <div className="dash-panel-head dash-snapshot-head">
        <div>
          <h2 id="monthly-snapshot-heading" className="dash-panel-title">
            Monthly Service Snapshot
          </h2>
          <p className="dash-panel-meta">
            {snapshot.periodLabel}
            <span className="dash-snapshot-meta-sep" aria-hidden="true">
              ·
            </span>
            America/New_York
          </p>
        </div>
      </div>

      <div className="dash-snapshot-hero" aria-label="Jobs this calendar month">
        <div className="dash-snapshot-metric">
          <p className="dash-snapshot-metric-value">{snapshot.jobsCreated}</p>
          <p className="dash-snapshot-metric-label">Jobs created</p>
        </div>
        <div className="dash-snapshot-metric">
          <p className="dash-snapshot-metric-value">{snapshot.jobsCompleted}</p>
          <p className="dash-snapshot-metric-label">Jobs completed</p>
        </div>
        <div className="dash-snapshot-metric dash-snapshot-metric--accent">
          <p className="dash-snapshot-metric-value">
            {conversionPct !== null ? `${conversionPct}%` : "—"}
          </p>
          <p className="dash-snapshot-metric-label">Website follow-through</p>
        </div>
      </div>

      <div className="dash-snapshot-grid">
        <div className="dash-snapshot-block">
          <h3 className="dash-snapshot-label">Website jobs by service</h3>
          <p className="dash-snapshot-sublabel">
            website_inquiry & website_quote · created this month
          </p>
          <ul className="dash-snapshot-lines">
            {inquiryRows.map((row) => (
              <li key={row.label}>
                <span>{row.label}</span>
                <strong className="dash-snapshot-num">{row.value}</strong>
              </li>
            ))}
          </ul>
        </div>

        <div className="dash-snapshot-block">
          <h3 className="dash-snapshot-label">Website pipeline</h3>
          <p className="dash-snapshot-sublabel">Created this month</p>
          <ul className="dash-snapshot-lines dash-snapshot-lines--tight">
            <li>
              <span>Website-sourced</span>
              <strong className="dash-snapshot-num">
                {snapshot.websiteLeadsCreated}
              </strong>
            </li>
            <li>
              <span>Past New / Not Sold</span>
              <strong className="dash-snapshot-num">
                {snapshot.websiteLeadsProgressed}
              </strong>
            </li>
          </ul>
        </div>

        <div className="dash-snapshot-block dash-snapshot-block--note">
          <h3 className="dash-snapshot-label">How to read this</h3>
          <p className="dash-snapshot-note">
            Top figures use the NY calendar month for all non-archived jobs.
            Website rows count only jobs from the site inquiry or quote forms.
            Follow-through is not revenue attribution.
          </p>
        </div>
      </div>
    </section>
  );
}
