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

  return (
    <section
      className="dash-panel is-secondary"
      aria-labelledby="monthly-snapshot-heading"
    >
      <div className="dash-panel-head">
        <div>
          <h2 id="monthly-snapshot-heading" className="dash-panel-title">
            Monthly Service Snapshot
          </h2>
          <p className="dash-panel-meta">{snapshot.periodLabel} · America/New_York</p>
        </div>
      </div>

      <div className="dash-snapshot-grid">
        <div className="dash-snapshot-block">
          <h3 className="dash-snapshot-label">Website-sourced jobs (by service)</h3>
          <p className="dash-snapshot-hint">
            Counts active jobs created this calendar month with source
            website_inquiry or website_quote — not a separate leads inbox.
          </p>
          <ul className="dash-snapshot-lines">
            <li>
              <span>Window Tint</span>
              <strong>{snapshot.inquiries["Window Tint"]}</strong>
            </li>
            <li>
              <span>Remote Starters</span>
              <strong>{snapshot.inquiries["Remote Starters"]}</strong>
            </li>
            <li>
              <span>Vehicle Security</span>
              <strong>{snapshot.inquiries["Vehicle Security"]}</strong>
            </li>
            <li>
              <span>Other</span>
              <strong>{snapshot.inquiries.Other}</strong>
            </li>
          </ul>
        </div>

        <div className="dash-snapshot-block">
          <h3 className="dash-snapshot-label">Jobs</h3>
          <ul className="dash-snapshot-lines">
            <li>
              <span>Created this month</span>
              <strong>{snapshot.jobsCreated}</strong>
            </li>
            <li>
              <span>Completed this month</span>
              <strong>{snapshot.jobsCompleted}</strong>
            </li>
          </ul>
        </div>

        <div className="dash-snapshot-block">
          <h3 className="dash-snapshot-label">Website job follow-through</h3>
          <p className="dash-snapshot-hint">{snapshot.conversionNote}</p>
          <ul className="dash-snapshot-lines">
            <li>
              <span>Website-sourced jobs created</span>
              <strong>{snapshot.websiteLeadsCreated}</strong>
            </li>
            <li>
              <span>Status beyond New / Not Sold</span>
              <strong>{snapshot.websiteLeadsProgressed}</strong>
            </li>
            {conversionPct !== null ? (
              <li>
                <span>Follow-through rate (not revenue attribution)</span>
                <strong>{conversionPct}%</strong>
              </li>
            ) : (
              <li>
                <span>Follow-through rate</span>
                <strong>—</strong>
              </li>
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}
