import Link from "next/link";
import StatCard from "@/components/admin/StatCard";
import JobStatusBadge from "@/components/admin/JobStatusBadge";
import {
  getDashboardStats,
  getRecentJobs,
} from "@/lib/jobs/service";
import {
  getGoogleCalendarUrl,
  isGoogleCalendarConfigured,
  listUpcomingCalendarEvents,
} from "@/lib/google/calendar";
import { listContentUploadsFromDb } from "@/lib/google/drive";
import { formatCustomerName, formatDate, formatVehicleShort } from "@/lib/utils/format";

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

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--dv8-muted)]">
          Command Center
        </p>
        <h1 className="mt-2 text-3xl font-light tracking-tight">Dashboard</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="New Jobs" value={stats.newJobs} />
        <StatCard label="Scheduled Today" value={stats.scheduledToday} />
        <StatCard label="Ready For Pickup" value={stats.readyForPickup} />
        <StatCard label="Completed This Month" value={stats.completedThisMonth} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Link href="/admin/invoices/new" className="admin-btn admin-btn-primary">
          New Invoice
        </Link>
        <Link href="/admin/jobs" className="admin-btn">
          View Jobs
        </Link>
        <a href={getGoogleCalendarUrl()} target="_blank" rel="noopener noreferrer" className="admin-btn">
          Open Calendar
        </a>
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
                <div key={job.id} className="flex items-center justify-between gap-4 border-b border-[var(--dv8-border)] pb-3 last:border-0">
                  <div>
                    <p>{formatCustomerName(job.customers)}</p>
                    <p className="text-sm text-[var(--dv8-muted)]">
                      {formatVehicleShort(job.vehicles)} · {job.service_type}
                    </p>
                  </div>
                  <JobStatusBadge status={job.status} />
                </div>
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
                <div key={item.id} className="flex items-center justify-between gap-4 border-b border-[var(--dv8-border)] pb-3 last:border-0">
                  <div>
                    <p>{item.vehicle_name}</p>
                    <p className="text-sm text-[var(--dv8-muted)]">
                      {item.service_type} · {item.photos_count} photos · {item.videos_count} videos
                    </p>
                  </div>
                  <span className="text-xs text-[var(--dv8-muted)]">{formatDate(item.upload_date)}</span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="admin-panel p-5">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-lg font-light">Google Calendar Overview</h2>
          <a href={getGoogleCalendarUrl()} target="_blank" rel="noopener noreferrer" className="admin-btn">
            Open Calendar
          </a>
        </div>
        {!calendarConnected ? (
          <p className="text-sm text-[var(--dv8-muted)]">
            Google Calendar is not connected yet.
          </p>
        ) : calendarEvents.length === 0 ? (
          <p className="text-sm text-[var(--dv8-muted)]">No upcoming events found.</p>
        ) : (
          <div className="space-y-3">
            {calendarEvents.map((event) => (
              <div key={event.id} className="flex items-center justify-between gap-4 border-b border-[var(--dv8-border)] pb-3 last:border-0">
                <div>
                  <p>{event.title}</p>
                  <p className="text-sm text-[var(--dv8-muted)]">{event.start}</p>
                </div>
                {event.htmlLink && (
                  <a href={event.htmlLink} target="_blank" rel="noopener noreferrer" className="admin-btn">
                    Open Event
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
