import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/require-admin";
import {
  isGoogleCalendarConfigured,
  listUpcomingCalendarEvents,
} from "@/lib/google/calendar";
import { CalendarIntegrationError } from "@/lib/google/calendar-errors";

export async function GET() {
  const { error } = await requireAdminSession();
  if (error) return error;

  if (!isGoogleCalendarConfigured()) {
    return NextResponse.json({
      connected: false,
      events: [],
      message: "Google Calendar is not connected yet.",
      code: "calendar_not_configured",
    });
  }

  try {
    const events = await listUpcomingCalendarEvents();
    return NextResponse.json({ connected: true, events });
  } catch (calendarError) {
    if (calendarError instanceof CalendarIntegrationError) {
      console.error(`[google/calendar] ${calendarError.code}`);
      return NextResponse.json(
        {
          connected: false,
          events: [],
          message: calendarError.message,
          code: calendarError.code,
        },
        { status: calendarError.status },
      );
    }

    console.error("[google/calendar] unexpected_error");
    return NextResponse.json(
      {
        connected: false,
        events: [],
        message: "Google Calendar request failed.",
        code: "calendar_api_failed",
      },
      { status: 502 },
    );
  }
}
