import Link from "next/link";
import AdminNotifications from "@/components/admin/AdminNotifications";
import CustomerRepliesPanel from "@/components/admin/CustomerRepliesPanel";
import StatCard from "@/components/admin/StatCard";
import JobStatusBadge from "@/components/admin/JobStatusBadge";
import {
  getDashboardStats,
  getJobIdsByCalendarEventIds,
  getRecentJobs,
} from "@/lib/jobs/service";
import {
  getGoogleCalendarUrl,
  isGoogleCalendarConfigured,
  listUpcomingCalendarEvents,
} from "@/lib/google/calendar";
import { CalendarIntegrationError } from "@/lib/google/calendar-errors";
import { buildGoogleWorkspaceReconnectHref } from "@/lib/google/gmail-ui";
import { listContentUploadsFromDb } from "@/lib/google/drive";
import {
  formatCustomerName,
  formatDate,
  formatDateTimeNy,
  formatVehicleShort,
} from "@/lib/utils/format";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminDashboardPage() {
  let calendarAuthFailed = false;
  const [stats, recentJobs, recentContent, calendarEvents] = await Promise.all([
    getDashboardStats(),
    getRecentJobs(6),
    listContentUploadsFromDb(),
    isGoogleCalendarConfigured()
      ? listUpcomingCalendarEvents(6).catch((error) => {
          if (
            error instanceof CalendarIntegrationError &&
            (error.code === "calendar_auth_failed" ||
              error.code === "calendar_wrong_account")
          ) {
            calendarAuthFailed = true;
          }
          return [];
        })
      : Promise.resolve([]),
  ]);

  const calendarConnected = isGoogleCalendarConfigured() && !calendarAuthFailed;
  const reconnectHref = buildGoogleWorkspaceReconnectHref("/admin/dashboard");
  const jobsByEventId = await getJobIdsByCalendarEventIds(
    calendarEvents.map((event) => event.id),
  );

  const appointments = calendarEvents.map((event) => {
    const jobId = event.jobId || jobsByEventId.get(event.id) || null;
    return { ...event, matchedJobId: jobId };
  });

  return (
    <div className="dash-page">
      <header className="dash-header">
        <div className="dash-header-copy">
          <p className="dash-header-eyebrow">Service</p>
          <h1 className="dash-header-title">Overview</h1>
          <p className="dash-header-lede">Overview of your business</p>
        </div>
        <AdminNotifications placement="dashboard" />
      </header>

      <div className="dash-kpi-grid">
        <StatCard label="New Jobs" value={stats.newJobs} />
        <StatCard label="Scheduled Today" value={stats.scheduledToday} />
        <StatCard label="Ready For Pickup" value={stats.readyForPickup} />
        <StatCard label="Completed This Month" value={stats.completedThisMonth} />
      </div>

      <nav className="dash-actions" aria-label="Quick actions">
        <Link href="/admin/invoices/new" className="dash-action is-primary">
          New Invoice
        </Link>
        <Link href="/admin/jobs" className="dash-action">
          View Jobs
        </Link>
        <Link href="/admin/customers" className="dash-action">
          View Clients
        </Link>
      </nav>

      <CustomerRepliesPanel />

      <div className="dash-split">
        <section
          className="dash-panel is-standard"
          aria-labelledby="recent-jobs-heading"
        >
          <div className="dash-panel-head">
            <h2 id="recent-jobs-heading" className="dash-panel-title">
              Recent Jobs
            </h2>
          </div>
          <div className="dash-list">
            {recentJobs.length === 0 ? (
              <p className="dash-empty">No jobs yet.</p>
            ) : (
              recentJobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/admin/jobs?jobId=${job.id}`}
                  className="dash-list-row"
                >
                  <div className="min-w-0">
                    <p className="dash-list-primary truncate">
                      {formatCustomerName(job.customers)}
                    </p>
                    <p className="dash-list-secondary truncate">
                      {formatVehicleShort(job.vehicles)} · {job.service_type}
                    </p>
                  </div>
                  <JobStatusBadge status={job.status} />
                </Link>
              ))
            )}
          </div>
        </section>

        <section
          className={`dash-panel is-secondary${recentContent.slice(0, 6).length === 0 ? " is-empty" : ""}`}
          aria-labelledby="recent-content-heading"
        >
          <div className="dash-panel-head">
            <h2 id="recent-content-heading" className="dash-panel-title">
              Recent Content
            </h2>
          </div>
          <div className="dash-list">
            {recentContent.slice(0, 6).length === 0 ? (
              <p className="dash-empty">No content synced yet.</p>
            ) : (
              recentContent.slice(0, 6).map((item) => (
                <div key={item.id} className="dash-list-row">
                  <div className="min-w-0">
                    <p className="dash-list-primary truncate">{item.vehicle_name}</p>
                    <p className="dash-list-secondary truncate">
                      {item.service_type} · {item.photos_count} photos ·{" "}
                      {item.videos_count} videos
                    </p>
                  </div>
                  <span className="dash-list-meta">
                    {formatDate(item.upload_date)}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="dash-panel is-secondary" aria-labelledby="appointments-heading">
        <div className="dash-panel-head">
          <div>
            <h2 id="appointments-heading" className="dash-panel-title">
              Upcoming Appointments
            </h2>
            <p className="dash-panel-meta">Times shown in America/New_York</p>
          </div>
          <a
            href={getGoogleCalendarUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="dash-panel-link"
          >
            Open Google Calendar
          </a>
        </div>

        {!calendarConnected ? (
          <div className="space-y-3">
            <p className="dash-empty">
              {calendarAuthFailed
                ? "Google Calendar authorization failed. Reconnect sales@autodv8ions.com."
                : "Google Calendar is not connected yet."}
            </p>
            <a className="dash-action is-primary" href={reconnectHref}>
              Reconnect Google Workspace
            </a>
          </div>
        ) : appointments.length === 0 ? (
          <p className="dash-empty">No upcoming appointments.</p>
        ) : (
          <div className="dash-list">
            {appointments.map((event) => {
              if (event.matchedJobId) {
                return (
                  <Link
                    key={event.id}
                    href={`/admin/jobs?jobId=${event.matchedJobId}`}
                    className="dash-list-row"
                  >
                    <div className="min-w-0">
                      <p className="dash-list-primary truncate">{event.title}</p>
                      <p className="dash-list-secondary">
                        {formatDateTimeNy(event.start)}
                      </p>
                    </div>
                    <span className="dash-list-cta">View Job</span>
                  </Link>
                );
              }

              return (
                <div key={event.id} className="dash-list-row">
                  <div className="min-w-0">
                    <p className="dash-list-primary truncate">{event.title}</p>
                    <p className="dash-list-secondary">
                      {formatDateTimeNy(event.start)}
                    </p>
                  </div>
                  {event.htmlLink ? (
                    <a
                      href={event.htmlLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="dash-panel-link"
                    >
                      Calendar
                    </a>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
