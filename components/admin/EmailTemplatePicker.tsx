"use client";

import {
  EMAIL_TEMPLATES,
  type EmailTemplateId,
  applyReviewLinkPlaceholder,
} from "@/lib/constants/email-templates";

type EmailTemplatePickerProps = {
  idPrefix: string;
  reviewUrl?: string | null;
  disabled?: boolean;
  onApply: (subject: string, body: string) => void;
  hasDraft: boolean;
};

export default function EmailTemplatePicker({
  idPrefix,
  reviewUrl = null,
  disabled = false,
  onApply,
  hasDraft,
}: EmailTemplatePickerProps) {
  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const templateId = event.target.value as EmailTemplateId | "";
    event.target.value = "";
    if (!templateId) return;

    const template = EMAIL_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;

    const body =
      template.id === "google_review"
        ? applyReviewLinkPlaceholder(template.body, reviewUrl)
        : template.body;

    if (hasDraft) {
      const ok = window.confirm(
        "Replace your current draft with this template? You can still edit before sending.",
      );
      if (!ok) return;
    }

    onApply(template.subject, body);
  }

  const composerTemplates = EMAIL_TEMPLATES.filter((t) => t.id !== "google_review");

  return (
    <div className="job-comm-template-row">
      <label className="admin-label" htmlFor={`${idPrefix}-template`}>
        Template
      </label>
      <select
        id={`${idPrefix}-template`}
        className="admin-input job-comm-template-select"
        defaultValue=""
        disabled={disabled}
        onChange={handleChange}
      >
        <option value="">Insert template…</option>
        {composerTemplates.map((t) => (
          <option key={t.id} value={t.id}>
            {t.label}
          </option>
        ))}
      </select>
    </div>
  );
}
