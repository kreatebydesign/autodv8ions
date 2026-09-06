import Link from "next/link";
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
  const [stats, recentJobs, recentContent, calendarEvents] = await Promise.all([
    getDashboardStats(),
    getRecentJobs(6),
    listContentUploadsFromDb(),
    isGoogleCalendarConfigured()
      ? listUpcomingCalendarEvents(6).catch(() => [])
      : Promise.resolve([]),
  ]);

  const calendarConnected = isGoogleCalendarConfigured();
  const jobsByEventId = await getJobIdsByCalendarEventIds(
    calendarEvents.map((event) => event.id),
  );

  const appointments = calendarEvents.map((event) => {
    const jobId = event.jobId || jobsByEventId.get(event.id) || null;
    return { ...event, matchedJobId: jobId };
  });

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--dv8-muted)]">
          Operations Workspace
        </p>
        <h1 className="mt-2 text-3xl font-light tracking-tight">Dashboard</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="New Jobs" value={stats.newJobs} />
        <StatCard label="Scheduled Today" value={stats.scheduledToday} />
        <StatCard label="Ready For Pickup" value={stats.readyForPickup} />
        <StatCard label="Completed This Month" value={stats.completedThisMonth} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Link href="/admin/invoices/new" className="admin-btn admin-btn-primary">
          New Invoice
        </Link>
        <Link href="/admin/jobs" className="admin-btn">
          View Jobs
        </Link>
        <Link href="/admin/customers" className="admin-btn">
          View Customers
        </Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="admin-panel p-5">
          <h2 className="mb-4 text-lg font-light">Recent Jobs</h2>
          <div className="space-y-3">
            {recentJobs.length === 0 ? (
              <p className="text-sm text-[var(--dv8-muted)]">No jobs yet.</p>
            ) : (
              recentJobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/admin/jobs?jobId=${job.id}`}
                  className="flex items-center justify-between gap-4 border-b border-[var(--dv8-border)] pb-3 last:border-0 transition-colors hover:bg-white/[0.03] focus-visible:bg-white/[0.03] focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[rgba(211,11,11,0.45)]"
                >
                  <div>
                    <p>{formatCustomerName(job.customers)}</p>
                    <p className="text-sm text-[var(--dv8-muted)]">
                      {formatVehicleShort(job.vehicles)} · {job.service_type}
                    </p>
                  </div>
                  <JobStatusBadge status={job.status} />
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="admin-panel p-5">
          <h2 className="mb-4 text-lg font-light">Recent Content Uploads</h2>
          <div className="space-y-3">
            {recentContent.slice(0, 6).length === 0 ? (
              <p className="text-sm text-[var(--dv8-muted)]">No content synced yet.</p>
            ) : (
              recentContent.slice(0, 6).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-4 border-b border-[var(--dv8-border)] pb-3 last:border-0"
                >
                  <div>
                    <p>{item.vehicle_name}</p>
                    <p className="text-sm text-[var(--dv8-muted)]">
                      {item.service_type} · {item.photos_count} photos · {item.videos_count} videos
                    </p>
                  </div>
                  <span className="text-xs text-[var(--dv8-muted)]">
                    {formatDate(item.upload_date)}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="admin-panel p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-light">Upcoming Appointments</h2>
            <p className="mt-1 text-xs text-[var(--dv8-muted)]">
              Times shown in America/New_York
            </p>
          </div>
          <a
            href={getGoogleCalendarUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[var(--dv8-muted)] underline-offset-2 hover:text-white hover:underline"
          >
            Open Google Calendar
          </a>
        </div>

        {!calendarConnected ? (
          <p className="text-sm text-[var(--dv8-muted)]">
            Google Calendar is not connected yet.
          </p>
        ) : appointments.length === 0 ? (
          <p className="text-sm text-[var(--dv8-muted)]">No upcoming appointments.</p>
        ) : (
          <div className="space-y-3">
            {appointments.map((event) => {
              const rowClassName =
                "flex items-center justify-between gap-4 border-b border-[var(--dv8-border)] pb-3 last:border-0";

              if (event.matchedJobId) {
                return (
                  <Link
                    key={event.id}
                    href={`/admin/jobs?jobId=${event.matchedJobId}`}
                    className={`${rowClassName} transition-colors hover:bg-white/[0.03] focus-visible:bg-white/[0.03] focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[rgba(211,11,11,0.45)]`}
                  >
                    <div>
                      <p>{event.title}</p>
                      <p className="text-sm text-[var(--dv8-muted)]">
                        {formatDateTimeNy(event.start)}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs uppercase tracking-[0.12em] text-[var(--dv8-red-bright)]">
                      View Job
                    </span>
                  </Link>
                );
              }

              return (
                <div key={event.id} className={rowClassName}>
                  <div>
                    <p>{event.title}</p>
                    <p className="text-sm text-[var(--dv8-muted)]">
                      {formatDateTimeNy(event.start)}
                    </p>
                  </div>
                  {event.htmlLink ? (
                    <a
                      href={event.htmlLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-xs text-[var(--dv8-muted)] underline-offset-2 hover:underline"
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
