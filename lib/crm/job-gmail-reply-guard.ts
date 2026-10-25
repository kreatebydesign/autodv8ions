/**
 * Ensures Gmail replies cannot target arbitrary threads when a job has an explicit link.
 */
export function validateReplyThreadForJob(params: {
  requestedThreadId: string;
  linkedThreadId: string | null;
}): { ok: true } | { ok: false; code: string; message: string } {
  const requested = params.requestedThreadId.trim();
  const linked = params.linkedThreadId?.trim() || null;

  if (!linked) {
    return {
      ok: false,
      code: "gmail_thread_not_linked",
      message: "Link a Gmail conversation to this job before replying.",
    };
  }

  if (requested !== linked) {
    return {
      ok: false,
      code: "gmail_thread_not_linked",
      message: "This Gmail thread is not linked to this job.",
    };
  }

  return { ok: true };
}
