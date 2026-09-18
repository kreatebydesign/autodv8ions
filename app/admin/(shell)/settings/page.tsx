import {
  getGoogleCalendarUrl,
  isGoogleCalendarConfigured,
} from "@/lib/google/calendar";
import { isGoogleGmailConfigured } from "@/lib/google/gmail";
import { buildGoogleWorkspaceReconnectHref } from "@/lib/google/gmail-ui";
import { isGoogleDriveConfigured } from "@/lib/google/drive";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export default function AdminSettingsPage() {
  const calendarConnected = isGoogleCalendarConfigured();
  const gmailConfigured = isGoogleGmailConfigured();
  const reconnectHref = buildGoogleWorkspaceReconnectHref("/admin/settings");

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
              {calendarConnected
                ? "Configured"
                : "Google Calendar is not connected yet."}
            </p>
            <p>
              Gmail:{" "}
              {gmailConfigured
                ? "Configured"
                : "Gmail is not connected yet."}
            </p>
            <p>
              Google Drive:{" "}
              {isGoogleDriveConfigured()
                ? "Connected"
                : "Google Drive is not connected yet."}
            </p>
            {(!calendarConnected || !gmailConfigured) && (
              <div className="pt-2">
                <a className="admin-btn admin-btn-primary" href={reconnectHref}>
                  Reconnect Google Workspace
                </a>
                <p className="mt-2 text-xs text-[var(--dv8-muted)]">
                  Authorize sales@autodv8ions.com for Gmail and Calendar in one step.
                </p>
              </div>
            )}
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
            <a className="admin-btn" href={reconnectHref}>
              Reconnect Google Workspace
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
