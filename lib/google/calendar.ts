import { google } from "googleapis";
import type { Job } from "@/lib/types/database";
import { buildCalendarDetails, formatCustomerName } from "@/lib/utils/format";
import {
  CalendarIntegrationError,
  mapCalendarApiError,
} from "@/lib/google/calendar-errors";
import {
  hasEnvCalendarRefreshToken,
  isGoogleOAuthClientConfigured,
  resolveWorkspaceRefreshToken,
} from "@/lib/google/workspace-credentials";

export const CALENDAR_TIME_ZONE = "America/New_York";
export const DEFAULT_APPOINTMENT_DURATION_HOURS = 2;

export type CalendarEventSummary = {
  id: string;
  title: string;
  start: string;
  end: string;
  htmlLink: string;
  jobId: string | null;
};

export type CalendarEventDetail = {
  id: string;
  htmlLink: string;
  start: string;
  end: string;
  durationMs: number;
  jobId: string | null;
};

export class CalendarEventMissingError extends Error {
  constructor(
    message = "This appointment is no longer on Google Calendar. Cancel it here to clear the link, then schedule a new one.",
  ) {
    super(message);
    this.name = "CalendarEventMissingError";
  }
}

export function isGoogleCalendarClientConfigured() {
  return Boolean(
    isGoogleOAuthClientConfigured() && process.env.GOOGLE_CALENDAR_ID?.trim(),
  );
}

/**
 * Sync gate: OAuth client + calendar id, plus env bootstrap token or Supabase
 * (for reconnect-stored Workspace credentials).
 */
export function isGoogleCalendarConfigured() {
  if (!isGoogleCalendarClientConfigured()) return false;
  if (hasEnvCalendarRefreshToken()) return true;
  return Boolean(
    process.env.SUPABASE_URL?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
}

async function getOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const refreshToken = await resolveWorkspaceRefreshToken(
    process.env.GOOGLE_REFRESH_TOKEN || null,
  );

  if (!clientId || !clientSecret || !refreshToken) {
    throw new CalendarIntegrationError(
      "calendar_not_configured",
      "Google Calendar is not connected yet.",
      503,
    );
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return oauth2Client;
}

async function getCalendarClient() {
  const auth = await getOAuthClient();
  const calendarId = process.env.GOOGLE_CALENDAR_ID?.trim();
  if (!calendarId) {
    throw new CalendarIntegrationError(
      "calendar_not_configured",
      "Google Calendar is not connected yet.",
      503,
    );
  }
  return {
    calendar: google.calendar({ version: "v3", auth }),
    calendarId,
  };
}

function isGoogleNotFoundError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const err = error as {
    code?: number | string;
    status?: number;
    response?: { status?: number };
  };
  const code = Number(err.code ?? err.status ?? err.response?.status);
  return code === 404;
}

/** Normalize datetime-local / ISO-ish input to `YYYY-MM-DDTHH:mm:ss` wall time. */
export function normalizeWallDateTime(value: string) {
  const trimmed = value.trim();
  const match = trimmed.match(
    /^(\d{4}-\d{2}-\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?/,
  );
  if (!match) {
    throw new Error("Invalid appointment date/time.");
  }
  const seconds = match[4] ?? "00";
  return `${match[1]}T${match[2]}:${match[3]}:${seconds}`;
}

/** Add duration to a wall-clock datetime string (duration arithmetic). */
export function addDurationToWallDateTime(wallDateTime: string, durationMs: number) {
  const normalized = normalizeWallDateTime(wallDateTime);
  const match = normalized.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/,
  );
  if (!match) {
    throw new Error("Invalid appointment date/time.");
  }

  const asUtc = Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    Number(match[6]),
  );
  const shifted = new Date(asUtc + durationMs);

  const yyyy = shifted.getUTCFullYear();
  const mm = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(shifted.getUTCDate()).padStart(2, "0");
  const hh = String(shifted.getUTCHours()).padStart(2, "0");
  const mi = String(shifted.getUTCMinutes()).padStart(2, "0");
  const ss = String(shifted.getUTCSeconds()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}`;
}

/** Add whole hours to a wall-clock datetime string (duration arithmetic). */
export function addHoursToWallDateTime(wallDateTime: string, hours: number) {
  return addDurationToWallDateTime(wallDateTime, hours * 60 * 60 * 1000);
}

function durationMsFromRange(start?: string | null, end?: string | null) {
  const defaultMs = DEFAULT_APPOINTMENT_DURATION_HOURS * 60 * 60 * 1000;
  if (!start || !end) return defaultMs;

  const startMs = Date.parse(start);
  const endMs = Date.parse(end);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    return defaultMs;
  }

  const durationMs = endMs - startMs;
  const minMs = 15 * 60 * 1000;
  const maxMs = 12 * 60 * 60 * 1000;
  if (durationMs < minMs || durationMs > maxMs) return defaultMs;
  return durationMs;
}

export async function listUpcomingCalendarEvents(
  maxResults = 8,
): Promise<CalendarEventSummary[]> {
  if (!isGoogleCalendarConfigured()) return [];

  try {
    const { calendar, calendarId } = await getCalendarClient();

    const { data } = await calendar.events.list({
      calendarId,
      timeMin: new Date().toISOString(),
      maxResults,
      singleEvents: true,
      orderBy: "startTime",
      fields:
        "items(id,summary,start,end,htmlLink,extendedProperties/private)",
    });

    return (data.items || []).map((event) => ({
      id: event.id || "",
      title: event.summary || "Untitled",
      start: event.start?.dateTime || event.start?.date || "",
      end: event.end?.dateTime || event.end?.date || "",
      htmlLink: event.htmlLink || "",
      jobId: event.extendedProperties?.private?.jobId || null,
    }));
  } catch (error) {
    throw mapCalendarApiError(error);
  }
}

export async function getCalendarEvent(
  eventId: string,
): Promise<CalendarEventDetail> {
  if (!isGoogleCalendarConfigured()) {
    throw new CalendarIntegrationError(
      "calendar_not_configured",
      "Google Calendar is not connected yet.",
      503,
    );
  }
  if (!eventId?.trim()) {
    throw new Error("Calendar event id is required.");
  }

  try {
    const { calendar, calendarId } = await getCalendarClient();

    const { data } = await calendar.events.get({
      calendarId,
      eventId,
      fields: "id,htmlLink,start,end,extendedProperties/private",
    });

    const start = data.start?.dateTime || data.start?.date || "";
    const end = data.end?.dateTime || data.end?.date || "";

    return {
      id: data.id || eventId,
      htmlLink: data.htmlLink || "",
      start,
      end,
      durationMs: durationMsFromRange(start, end),
      jobId: data.extendedProperties?.private?.jobId || null,
    };
  } catch (error) {
    if (isGoogleNotFoundError(error)) {
      throw new CalendarEventMissingError();
    }
    throw mapCalendarApiError(error);
  }
}

export async function createCalendarEventForJob(
  job: Job,
  startDateTime: string,
  durationHours = DEFAULT_APPOINTMENT_DURATION_HOURS,
) {
  if (!isGoogleCalendarConfigured()) {
    throw new CalendarIntegrationError(
      "calendar_not_configured",
      "Google Calendar is not connected yet.",
      503,
    );
  }

  if (!startDateTime?.trim()) {
    throw new Error("Appointment date and time are required.");
  }

  try {
    const { calendar, calendarId } = await getCalendarClient();
    const customerName = formatCustomerName(job.customers);
    const startWall = normalizeWallDateTime(startDateTime);
    const endWall = addHoursToWallDateTime(startWall, durationHours);

    const { data } = await calendar.events.insert({
      calendarId,
      requestBody: {
        summary: `${customerName} — ${job.service_type}`,
        // Operational Calendar copy only — never includes internal_notes.
        description: buildCalendarDetails(job),
        location: "AutoDV8ions, Altoona, PA",
        start: { dateTime: startWall, timeZone: CALENDAR_TIME_ZONE },
        end: { dateTime: endWall, timeZone: CALENDAR_TIME_ZONE },
        extendedProperties: {
          private: {
            jobId: job.id,
          },
        },
      },
    });

    return {
      id: data.id || "",
      htmlLink: data.htmlLink || "",
      start: data.start?.dateTime || startWall,
      end: data.end?.dateTime || endWall,
    };
  } catch (error) {
    throw mapCalendarApiError(error);
  }
}

export async function updateCalendarEventForJob(
  job: Job,
  eventId: string,
  startDateTime: string,
) {
  if (!isGoogleCalendarConfigured()) {
    throw new CalendarIntegrationError(
      "calendar_not_configured",
      "Google Calendar is not connected yet.",
      503,
    );
  }

  if (!eventId?.trim()) {
    throw new Error("This job has no linked calendar appointment.");
  }

  if (!startDateTime?.trim()) {
    throw new Error("Appointment date and time are required.");
  }

  const existing = await getCalendarEvent(eventId);

  try {
    const { calendar, calendarId } = await getCalendarClient();
    const customerName = formatCustomerName(job.customers);
    const startWall = normalizeWallDateTime(startDateTime);
    const endWall = addDurationToWallDateTime(startWall, existing.durationMs);

    const { data } = await calendar.events.patch({
      calendarId,
      eventId,
      requestBody: {
        summary: `${customerName} — ${job.service_type}`,
        // Operational Calendar copy only — never includes internal_notes.
        description: buildCalendarDetails(job),
        location: "AutoDV8ions, Altoona, PA",
        start: { dateTime: startWall, timeZone: CALENDAR_TIME_ZONE },
        end: { dateTime: endWall, timeZone: CALENDAR_TIME_ZONE },
        extendedProperties: {
          private: {
            jobId: job.id,
          },
        },
      },
    });

    return {
      id: data.id || eventId,
      htmlLink: data.htmlLink || existing.htmlLink,
      start: data.start?.dateTime || startWall,
      end: data.end?.dateTime || endWall,
    };
  } catch (error) {
    if (isGoogleNotFoundError(error)) {
      throw new CalendarEventMissingError();
    }
    throw mapCalendarApiError(error);
  }
}

/**
 * Deletes a Google Calendar event.
 * Returns `{ alreadyMissing: true }` when the event was already gone (404).
 */
export async function deleteCalendarEvent(eventId: string) {
  if (!isGoogleCalendarConfigured()) {
    throw new CalendarIntegrationError(
      "calendar_not_configured",
      "Google Calendar is not connected yet.",
      503,
    );
  }

  if (!eventId?.trim()) {
    throw new Error("This job has no linked calendar appointment.");
  }

  try {
    const { calendar, calendarId } = await getCalendarClient();

    await calendar.events.delete({
      calendarId,
      eventId,
    });
    return { alreadyMissing: false as const };
  } catch (error) {
    if (isGoogleNotFoundError(error)) {
      return { alreadyMissing: true as const };
    }
    throw mapCalendarApiError(error);
  }
}

export function getGoogleCalendarUrl() {
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  if (!calendarId) return "https://calendar.google.com";
  return `https://calendar.google.com/calendar/u/0/r?cid=${encodeURIComponent(calendarId)}`;
}
