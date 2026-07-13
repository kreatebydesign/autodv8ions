"use client";

import { useState } from "react";

export default function ReviewBulkEditPanel({
  selectedCount,
  busy,
  onClose,
  onApply,
}: {
  selectedCount: number;
  busy: boolean;
  onClose: () => void;
  onApply: (fields: {
    shadePercentage?: string | null;
    description?: string | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
  }) => void;
}) {
  const [shade, setShade] = useState("");
  const [description, setDescription] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");

  function handleApply() {
    const fields: {
      shadePercentage?: string | null;
      description?: string | null;
      seoTitle?: string | null;
      seoDescription?: string | null;
    } = {};

    if (shade.trim()) fields.shadePercentage = shade.trim();
    if (description.trim()) fields.description = description.trim();
    if (seoTitle.trim()) fields.seoTitle = seoTitle.trim();
    if (seoDescription.trim()) fields.seoDescription = seoDescription.trim();

    if (Object.keys(fields).length === 0) return;
    onApply(fields);
  }

  return (
    <div className="review-bulk-edit-backdrop" role="presentation" onClick={onClose}>
      <div
        className="review-bulk-edit-panel"
        role="dialog"
        aria-labelledby="review-bulk-edit-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="review-bulk-edit-head">
          <div>
            <p className="review-panel-kicker">Selection editing</p>
            <h2 id="review-bulk-edit-title" className="review-bulk-edit-title">
              Edit {selectedCount} project{selectedCount === 1 ? "" : "s"}
            </h2>
          </div>
          <button type="button" className="review-btn review-btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>

        <p className="review-help">
          Only filled fields are applied to every selected project. Vehicle names,
          work dates, and publish state are never bulk-overwritten.
        </p>

        <label className="review-label">Tint package</label>
        <input
          className="review-field mb-4"
          value={shade}
          onChange={(e) => setShade(e.target.value)}
          placeholder="e.g. 15% ceramic"
        />

        <label className="review-label">Description</label>
        <textarea
          className="review-field mb-4 min-h-24"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Shared editorial description…"
        />

        <label className="review-label">SEO title</label>
        <input
          className="review-field mb-4"
          value={seoTitle}
          onChange={(e) => setSeoTitle(e.target.value)}
        />

        <label className="review-label">Meta description</label>
        <textarea
          className="review-field mb-4 min-h-20"
          value={seoDescription}
          onChange={(e) => setSeoDescription(e.target.value)}
        />

        <div className="review-bulk-edit-actions">
          <button
            type="button"
            className="review-btn review-btn-primary"
            disabled={busy}
            onClick={handleApply}
          >
            {busy ? "Applying…" : "Apply to selected"}
          </button>
          <button
            type="button"
            className="review-btn review-btn-ghost"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
