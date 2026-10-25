import Link from "next/link";
import {
  formatCustomerName,
  formatDateTimeNy,
  formatVehicleShort,
} from "@/lib/utils/format";
import type { FollowUpWithJob } from "@/lib/crm/follow-up";

export default function DashboardFollowUps({
  items,
  asOfIso,
}: {
  items: FollowUpWithJob[];
  /** Server-render anchor for overdue comparison (request time). */
  asOfIso: string;
}) {
  if (items.length === 0) return null;

  const now = Date.parse(asOfIso);

  return (
    <section
      className="dash-panel is-standard"
      aria-labelledby="follow-ups-heading"
    >
      <div className="dash-panel-head">
        <h2 id="follow-ups-heading" className="dash-panel-title">
          Follow-Ups
        </h2>
        <p className="dash-panel-meta">Due and overdue reminders</p>
      </div>
      <div className="dash-list">
        {items.map((item) => {
          const overdue = Date.parse(item.due_at) < now;
          const job = item.jobs;
          return (
            <Link
              key={item.id}
              href={`/admin/jobs?jobId=${item.job_id}`}
              className="dash-list-row"
            >
              <div className="min-w-0">
                <p className="dash-list-primary truncate">
                  {job?.customers
                    ? formatCustomerName(job.customers as never)
                    : "Job follow-up"}
                </p>
                <p className="dash-list-secondary truncate">
                  {formatVehicleShort(job?.vehicles as never)} ·{" "}
                  {job?.service_type || "Service"}
                </p>
                <p
                  className={`dash-list-meta${overdue ? " is-overdue" : ""}`}
                >
                  Due {formatDateTimeNy(item.due_at)}
                  {overdue ? " · Overdue" : ""}
                </p>
              </div>
              <span className="dash-list-cta">Open</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
