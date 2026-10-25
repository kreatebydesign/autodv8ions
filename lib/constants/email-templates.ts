export type EmailTemplateId =
  | "window_tint_quote"
  | "remote_starter_quote"
  | "appointment_confirmation"
  | "follow_up"
  | "thank_you"
  | "google_review";

export type EmailTemplate = {
  id: EmailTemplateId;
  label: string;
  subject: string;
  body: string;
};

export const EMAIL_TEMPLATES: readonly EmailTemplate[] = [
  {
    id: "window_tint_quote",
    label: "Window Tint Quote",
    subject: "Your window tint quote — AutoDV8ions",
    body: `Hi,

Thanks for reaching out about window tint. Once I have your vehicle details confirmed, I'll put together a quote for the film and install.

If anything about the vehicle changed since you contacted us, reply here and I'll adjust.

— AutoDV8ions`,
  },
  {
    id: "remote_starter_quote",
    label: "Remote Starter Quote",
    subject: "Remote starter quote — AutoDV8ions",
    body: `Hi,

Thanks for your interest in a remote starter. I'll check what Compustar options fit your year, make, and model, then send a real quote for parts and labor.

Reply with anything unusual about the vehicle (push-to-start, manual trans, etc.) if we haven't covered it yet.

— AutoDV8ions`,
  },
  {
    id: "appointment_confirmation",
    label: "Appointment Confirmation",
    subject: "You're on the schedule — AutoDV8ions",
    body: `Hi,

This confirms your appointment at AutoDV8ions. If you need to reschedule, reply to this email or call the shop.

See you then.

— AutoDV8ions`,
  },
  {
    id: "follow_up",
    label: "Follow-Up",
    subject: "Following up — AutoDV8ions",
    body: `Hi,

Just checking in on your project with us. Let me know if you have questions or if you're ready to move forward.

— AutoDV8ions`,
  },
  {
    id: "thank_you",
    label: "Thank You",
    subject: "Thanks from AutoDV8ions",
    body: `Hi,

Thanks for trusting us with your vehicle. If you need anything after the install, reply here or give the shop a call.

— AutoDV8ions`,
  },
  {
    id: "google_review",
    label: "Google Review Request",
    subject: "Quick favor — AutoDV8ions",
    body: `Hi,

If you have a minute, a Google review helps other drivers around Altoona find a shop they can trust. Only if you're happy with the work — no pressure.

{{REVIEW_LINK}}

Thanks again for your business.

— AutoDV8ions`,
  },
];

export function getEmailTemplate(id: EmailTemplateId): EmailTemplate | undefined {
  return EMAIL_TEMPLATES.find((t) => t.id === id);
}

export function applyReviewLinkPlaceholder(
  body: string,
  reviewUrl: string | null,
): string {
  if (!reviewUrl?.trim()) {
    return body.replace(/\{\{REVIEW_LINK\}\}/g, "[Google review link not configured]");
  }
  return body.replace(/\{\{REVIEW_LINK\}\}/g, reviewUrl.trim());
}
