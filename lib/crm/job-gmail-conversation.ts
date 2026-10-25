import type { JobGmailThreadLink } from "@/lib/crm/job-gmail-thread";
import { normalizeEmailAddress, threadInvolvesCustomer } from "@/lib/google/gmail-message";

export type GmailThreadCandidateSummary = {
  id: string;
  subject: string;
  snippet: string;
  messageCount: number;
  lastActivityIso: string | null;
};

export type JobGmailLinkWarning =
  | {
      code: "linked_email_mismatch";
      linkedEmail: string;
      currentEmail: string;
      message: string;
    }
  | {
      code: "linked_thread_participation";
      message: string;
    };

export function buildLinkEmailMismatchWarning(
  link: JobGmailThreadLink,
  currentCustomerEmail: string,
): JobGmailLinkWarning | null {
  const linked = normalizeEmailAddress(link.customer_email);
  const current = normalizeEmailAddress(currentCustomerEmail);
  if (!linked || !current || linked === current) return null;
  return {
    code: "linked_email_mismatch",
    linkedEmail: linked,
    currentEmail: current,
    message:
      "This job is linked to a conversation for a different email address on file. Review the link or update the customer email before relying on this thread.",
  };
}

export function buildParticipationWarning(
  messages: Array<{ from: string; to: string; cc?: string }>,
  customerEmail: string,
): JobGmailLinkWarning | null {
  if (threadInvolvesCustomer(messages, customerEmail)) return null;
  return {
    code: "linked_thread_participation",
    message:
      "The linked Gmail thread does not include this job's customer email. Unlink and choose a different conversation, or fix the customer email.",
  };
}

export function shouldExposeGmailThreadMessages(
  linkWarning: JobGmailLinkWarning | null,
): boolean {
  return linkWarning?.code !== "linked_thread_participation";
}
