import {
  getGoogleCalendarUrl,
  isGoogleCalendarConfigured,
} from "@/lib/google/calendar";
import { isGoogleDriveConfigured } from "@/lib/google/drive";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--dv8-muted)]">
          System
        </p>
        <h1 className="mt-2 text-3xl font-light tracking-tight">Settings</h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="admin-panel p-5">
          <h2 className="text-lg font-light">Integrations</h2>
          <div className="mt-4 space-y-3 text-sm">
            <p>Supabase: {isSupabaseConfigured() ? "Connected" : "Not configured"}</p>
            <p>
              Google Calendar:{" "}
              {isGoogleCalendarConfigured()
                ? "Connected"
                : "Google Calendar is not connected yet."}
            </p>
            <p>
              Google Drive:{" "}
              {isGoogleDriveConfigured()
                ? "Connected"
                : "Google Drive is not connected yet."}
            </p>
          </div>
        </section>

        <section className="admin-panel p-5">
          <h2 className="text-lg font-light">Quick Links</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <a href={getGoogleCalendarUrl()} target="_blank" rel="noopener noreferrer" className="admin-btn">
              Open Google Calendar
            </a>
            <a
              href="https://drive.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="admin-btn"
            >
              Open Google Drive
            </a>
          </div>
        </section>

        <section className="admin-panel p-5 lg:col-span-2">
          <h2 className="text-lg font-light">Workflow Reminder</h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--dv8-muted)]">
            Website quote or phone call → Chris contacts customer via Google Voice →
            Lisa schedules in Google Calendar → vehicle arrives → Lisa updates calendar
            colors/statuses → customer pickup → Lisa uploads photos/videos to Google Drive.
          </p>
        </section>
      </div>
    </div>
  );
}
