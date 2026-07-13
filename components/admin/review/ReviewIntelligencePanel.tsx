"use client";

import type { PortfolioIntelligenceRecord } from "@/lib/portfolio-intelligence/types";

function recommendationLabel(value: string) {
  switch (value) {
    case "homepage_feature":
      return "Homepage-worthy";
    case "publish":
      return "Recommended to publish";
    case "publish_if_needed":
      return "Publish if needed";
    case "hold":
      return "Hold";
    case "skip":
      return "Skip";
    default:
      return value;
  }
}

function categoryLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ReviewIntelligencePanel({
  intelligence,
  onApplyFeatured,
  onApplyGalleryOrder,
  onMarkHomepageCandidate,
  onPin,
  onIgnore,
  onReanalyze,
  busy,
}: {
  intelligence: PortfolioIntelligenceRecord | null;
  onApplyFeatured: (mediaId: string) => void;
  onApplyGalleryOrder: (order: string[]) => void;
  onMarkHomepageCandidate: () => void;
  onPin: () => void;
  onIgnore: () => void;
  onReanalyze: () => void;
  busy: boolean;
}) {
  if (!intelligence) {
    return (
      <div className="review-field-group review-intelligence">
        <p className="review-panel-kicker">Portfolio Intelligence</p>
        <p className="review-help">
          No intelligence report yet. Run analysis to score photography quality,
          category fit, and live showcase impact.
        </p>
        <button
          type="button"
          className="review-btn review-btn-soft"
          disabled={busy}
          onClick={onReanalyze}
        >
          {busy ? "Analyzing…" : "Analyze project"}
        </button>
      </div>
    );
  }

  if (intelligence.ignored) {
    return (
      <div className="review-field-group review-intelligence is-muted">
        <p className="review-panel-kicker">Portfolio Intelligence</p>
        <p className="review-help">Recommendation ignored for this project.</p>
        <button
          type="button"
          className="review-btn review-btn-ghost"
          disabled={busy}
          onClick={onIgnore}
        >
          Restore recommendation
        </button>
      </div>
    );
  }

  return (
    <div className="review-field-group review-intelligence">
      <div className="review-intelligence-head">
        <p className="review-panel-kicker">Portfolio Intelligence</p>
        <span className="review-intelligence-score">
          {intelligence.portfolioScore} Portfolio Score
        </span>
      </div>

      <div className="review-intelligence-badges">
        <span className="review-intel-badge is-primary">
          {recommendationLabel(intelligence.recommendation)}
        </span>
        <span className="review-intel-badge">
          {categoryLabel(intelligence.vehicleCategory)}
        </span>
        {intelligence.portfolioScore >= 75 && (
          <span className="review-intel-badge">Strong photography</span>
        )}
        {intelligence.suggestedPin && (
          <span className="review-intel-badge is-accent">Pin candidate</span>
        )}
      </div>

      <dl className="review-intelligence-grid">
        <div>
          <dt>Overall score</dt>
          <dd>{intelligence.portfolioScore}</dd>
        </div>
        <div>
          <dt>Recommendation</dt>
          <dd>{recommendationLabel(intelligence.recommendation)}</dd>
        </div>
        <div>
          <dt>Vehicle category</dt>
          <dd>{categoryLabel(intelligence.vehicleCategory)}</dd>
        </div>
        <div>
          <dt>Confidence</dt>
          <dd>{Math.round(intelligence.confidence * 100)}%</dd>
        </div>
      </dl>

      <p className="review-intelligence-summary">{intelligence.qualitySummary}</p>

      {intelligence.reasons.length > 0 && (
        <div className="review-intelligence-list">
          <p className="review-label">Reasons</p>
          <ul>
            {intelligence.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      )}

      {intelligence.weaknesses.length > 0 && (
        <div className="review-intelligence-list is-weak">
          <p className="review-label">Weaknesses</p>
          <ul>
            {intelligence.weaknesses.map((weakness) => (
              <li key={weakness}>{weakness}</li>
            ))}
          </ul>
        </div>
      )}

      {intelligence.suggestedFeaturedMediaId && (
        <p className="review-help">
          Suggested featured image ready.
        </p>
      )}

      {intelligence.replacementCandidateId && intelligence.replacementReason && (
        <p className="review-help">{intelligence.replacementReason}</p>
      )}

      <div className="review-intelligence-actions">
        {intelligence.suggestedFeaturedMediaId && (
          <button
            type="button"
            className="review-btn review-btn-soft"
            disabled={busy}
            onClick={() =>
              onApplyFeatured(intelligence.suggestedFeaturedMediaId!)
            }
          >
            Apply suggested featured image
          </button>
        )}
        {intelligence.suggestedGalleryOrder.length > 1 && (
          <button
            type="button"
            className="review-btn review-btn-soft"
            disabled={busy}
            onClick={() =>
              onApplyGalleryOrder(intelligence.suggestedGalleryOrder)
            }
          >
            Apply suggested gallery order
          </button>
        )}
        {intelligence.recommendation === "homepage_feature" && (
          <button
            type="button"
            className="review-btn review-btn-soft"
            disabled={busy}
            onClick={onMarkHomepageCandidate}
          >
            Mark as homepage candidate
          </button>
        )}
        {intelligence.suggestedPin && (
          <button
            type="button"
            className="review-btn review-btn-soft"
            disabled={busy}
            onClick={onPin}
          >
            Pin
          </button>
        )}
        <button
          type="button"
          className="review-btn review-btn-ghost"
          disabled={busy}
          onClick={onReanalyze}
        >
          Re-analyze
        </button>
        <button
          type="button"
          className="review-btn review-btn-ghost"
          disabled={busy}
          onClick={onIgnore}
        >
          Ignore recommendation
        </button>
      </div>
    </div>
  );
}
