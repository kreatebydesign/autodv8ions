import { classifyGmailApiError } from "@/lib/google/gmail-errors";

export class CalendarIntegrationError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "CalendarIntegrationError";
    this.code = code;
    this.status = status;
  }
}

export function mapCalendarApiError(
  error: unknown,
  fallbackCode = "calendar_api_failed",
  fallbackMessage = "Google Calendar request failed.",
): CalendarIntegrationError {
  if (error instanceof CalendarIntegrationError) return error;

  const classified = classifyGmailApiError(error);

  if (classified.kind === "auth") {
    return new CalendarIntegrationError(
      "calendar_auth_failed",
      "Google Calendar authorization failed. Reconnect sales@autodv8ions.com.",
      401,
    );
  }

  if (classified.kind === "not_found") {
    return new CalendarIntegrationError(
      "calendar_event_missing",
      "This appointment is no longer on Google Calendar. Cancel it here to clear the link, then schedule a new one.",
      404,
    );
  }

  if (classified.kind === "temporary") {
    return new CalendarIntegrationError(
      "calendar_temporarily_unavailable",
      "Google Calendar is temporarily unavailable. Try again in a moment.",
      502,
    );
  }

  return new CalendarIntegrationError(fallbackCode, fallbackMessage, classified.status);
}

export function isCalendarAuthorizationErrorCode(
  code: string | null | undefined,
): boolean {
  return (
    code === "calendar_auth_failed" ||
    code === "calendar_reconnect_required" ||
    code === "calendar_wrong_account" ||
    code === "google_auth_failed" ||
    code === "gmail_auth_failed" ||
    code === "gmail_wrong_account"
  );
}

export function isCalendarTemporaryErrorCode(
  code: string | null | undefined,
): boolean {
  return (
    code === "calendar_temporarily_unavailable" ||
    code === "calendar_api_failed"
  );
}
