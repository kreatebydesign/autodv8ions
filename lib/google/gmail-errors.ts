export class GmailIntegrationError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "GmailIntegrationError";
    this.code = code;
    this.status = status;
  }
}

export type MappedGmailErrorKind = "auth" | "not_found" | "temporary" | "other";

/**
 * Classify Google / Gmail API errors without logging bodies or tokens.
 */
export function classifyGmailApiError(error: unknown): {
  kind: MappedGmailErrorKind;
  status: number;
  apiStatus: number;
  apiMessage: string;
} {
  const err = error as {
    code?: number | string;
    status?: number;
    response?: {
      status?: number;
      data?: {
        error?:
          | string
          | { message?: string; status?: string; errors?: Array<{ reason?: string }> };
        error_description?: string;
      };
    };
    message?: string;
  };

  const apiStatus = Number(err.code ?? err.status ?? err.response?.status ?? 0);
  const dataError = err.response?.data?.error;
  const dataMessage =
    typeof dataError === "string"
      ? dataError
      : dataError && typeof dataError === "object"
        ? String(dataError.message || "")
        : "";
  const description = String(err.response?.data?.error_description || "");
  const apiMessage = [dataMessage, description, err.message || ""]
    .filter(Boolean)
    .join(" ");

  const authPattern =
    /invalid_grant|invalid[_ ]credentials|token has been expired or revoked|unauthorized|login required|authError|insufficient.?authentication|access[_ ]denied|invalid_client/i;

  if (
    apiStatus === 401 ||
    (apiStatus === 403 && /insufficient|permission|scope|auth/i.test(apiMessage)) ||
    authPattern.test(apiMessage)
  ) {
    return { kind: "auth", status: 401, apiStatus, apiMessage };
  }

  if (apiStatus === 404) {
    return { kind: "not_found", status: 404, apiStatus, apiMessage };
  }

  if (
    apiStatus === 429 ||
    apiStatus >= 500 ||
    /ECONNRESET|ETIMEDOUT|ENOTFOUND|socket hang up|temporarily|rate.?limit|quota/i.test(
      apiMessage,
    )
  ) {
    return { kind: "temporary", status: 502, apiStatus, apiMessage };
  }

  return { kind: "other", status: 502, apiStatus, apiMessage };
}

export function mapGmailApiError(
  error: unknown,
  fallbackCode: string,
  fallbackMessage: string,
): GmailIntegrationError {
  if (error instanceof GmailIntegrationError) return error;

  const classified = classifyGmailApiError(error);

  if (classified.kind === "auth") {
    return new GmailIntegrationError(
      "gmail_auth_failed",
      "Gmail authorization failed. Reconnect the sales@autodv8ions.com mailbox.",
      401,
    );
  }

  if (classified.kind === "not_found") {
    return new GmailIntegrationError(
      "gmail_thread_missing",
      "Thread no longer exists.",
      404,
    );
  }

  if (classified.kind === "temporary") {
    return new GmailIntegrationError(
      "gmail_temporarily_unavailable",
      "Gmail is temporarily unavailable. Try again in a moment.",
      502,
    );
  }

  return new GmailIntegrationError(fallbackCode, fallbackMessage, classified.status);
}

export function isGmailAuthorizationErrorCode(
  code: string | null | undefined,
): boolean {
  return (
    code === "gmail_auth_failed" ||
    code === "gmail_reconnect_required" ||
    code === "gmail_wrong_account"
  );
}

export function isGmailTemporaryErrorCode(code: string | null | undefined): boolean {
  return (
    code === "gmail_temporarily_unavailable" ||
    code === "gmail_api_failed" ||
    code === "gmail_reply_failed"
  );
}
