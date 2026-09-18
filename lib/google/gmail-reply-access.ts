/**
 * Pure request shaping for the Gmail reply API route.
 * Keeps admin-gate behavior testable without spinning up Next cookies.
 */
export function gmailReplyUnauthorizedResponse() {
  return {
    status: 401 as const,
    body: { error: "Unauthorized" },
  };
}

export function assertAdminForGmailReply(adminEmail: string | null | undefined) {
  if (!adminEmail) {
    return { ok: false as const, response: gmailReplyUnauthorizedResponse() };
  }
  return { ok: true as const, email: adminEmail };
}
