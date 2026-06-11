import { google } from "googleapis";
import type { Job } from "@/lib/types/database";
import { buildCalendarDetails, formatCustomerName, formatVehicleShort } from "@/lib/utils/format";

export function isGoogleCalendarConfigured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REFRESH_TOKEN &&
      process.env.GOOGLE_CALENDAR_ID,
  );
}

function getOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Google Calendar is not configured");
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return oauth2Client;
}

export async function listUpcomingCalendarEvents(maxResults = 8) {
  if (!isGoogleCalendarConfigured()) return [];

  const auth = getOAuthClient();
  const calendar = google.calendar({ version: "v3", auth });
  const calendarId = process.env.GOOGLE_CALENDAR_ID!;

  const { data } = await calendar.events.list({
    calendarId,
    timeMin: new Date().toISOString(),
    maxResults,
    singleEvents: true,
    orderBy: "startTime",
  });

  return (data.items || []).map((event) => ({
    id: event.id || "",
    title: event.summary || "Untitled",
    start: event.start?.dateTime || event.start?.date || "",
    end: event.end?.dateTime || event.end?.date || "",
    htmlLink: event.htmlLink || "",
  }));
}

export async function createCalendarEventForJob(job: Job, startDateTime?: string) {
  if (!isGoogleCalendarConfigured()) {
    throw new Error("Google Calendar is not connected yet.");
  }

  const auth = getOAuthClient();
  const calendar = google.calendar({ version: "v3", auth });
  const calendarId = process.env.GOOGLE_CALENDAR_ID!;
  const customerName = formatCustomerName(job.customers);
  const vehicle = formatVehicleShort(job.vehicles);
  const start = startDateTime ? new Date(startDateTime) : new Date(Date.now() + 86400000);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);

  const { data } = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary: `${customerName} — ${job.service_type}`,
      description: buildCalendarDetails(job),
      location: "AutoDV8ions, Altoona, PA",
      start: { dateTime: start.toISOString(), timeZone: "America/New_York" },
      end: { dateTime: end.toISOString(), timeZone: "America/New_York" },
    },
  });

  return {
    id: data.id || "",
    htmlLink: data.htmlLink || "",
  };
}

export function getGoogleCalendarUrl() {
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  if (!calendarId) return "https://calendar.google.com";
  return `https://calendar.google.com/calendar/u/0/r?cid=${encodeURIComponent(calendarId)}`;
}
