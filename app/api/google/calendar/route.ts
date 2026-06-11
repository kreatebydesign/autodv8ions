import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/require-admin";
import {
  isGoogleCalendarConfigured,
  listUpcomingCalendarEvents,
} from "@/lib/google/calendar";

export async function GET() {
  const { error } = await requireAdminSession();
  if (error) return error;

  if (!isGoogleCalendarConfigured()) {
    return NextResponse.json({
      connected: false,
      events: [],
      message: "Google Calendar is not connected yet.",
    });
  }

  try {
    const events = await listUpcomingCalendarEvents();
    return NextResponse.json({ connected: true, events });
  } catch (calendarError) {
    console.error("[google/calendar]", calendarError);
    return NextResponse.json({
      connected: false,
      events: [],
      message: "Google Calendar is not connected yet.",
    });
  }
}
