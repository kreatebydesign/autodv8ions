"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReviewDetailItem } from "@/lib/live-portfolio/review-data";
import { itemIsReadyForPublish } from "@/lib/live-portfolio/publish-readiness";
import { formatDate } from "@/lib/utils/format";
import ReviewIntelligencePanel from "./ReviewIntelligencePanel";
import type { PortfolioIntelligenceRecord } from "@/lib/portfolio-intelligence/types";

type Tab = "edit" | "preview";

export default function ReviewDetailWorkspace({
  item,
}: {
  item: ReviewDetailItem;
}) {
  const router = useRouter();
  const images = useMemo(
    () => item.media.filter((m) => m.mediaType === "image"),
    [item.media],
  );
  const [activeId, setActiveId] = useState(
    item.coverMediaId || images[0]?.id || null,
  );
  const [featuredId, setFeaturedId] = useState(
    images.find((m) => m.isFeatured)?.id ||
      item.coverMediaId ||
      images[0]?.id ||
      null,
  );
  const [tab, setTab] = useState<Tab>("edit");
  const [fullscreen, setFullscreen] = useState(false);
  const [vehicle, setVehicle] = useState(item.vehicle);
  const [workDate, setWorkDate] = useState(item.workDate || "");
  const [shade, setShade] = useState(item.shadePercentage || "");
  const [description, setDescription] = useState(item.description || "");
  const [seoTitle, setSeoTitle] = useState(item.seoTitle || "");
  const [seoDescription, setSeoDescription] = useState(
    item.seoDescription || "",
  );
  const [slug, setSlug] = useState(item.slug);
  const [published, setPublished] = useState(item.published);
  const [pinned, setPinned] = useState(item.pinned);
  const [lifecycleStatus, setLifecycleStatus] = useState(item.status);
  const [busy, setBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [intelligence, setIntelligence] =
    useState<PortfolioIntelligenceRecord | null>(item.intelligenceDetail);

  const ready = itemIsReadyForPublish(item);
  const isArchived =
    lifecycleStatus === "archived" || lifecycleStatus === "archived_review";

  const activeIndex = Math.max(
    0,
    images.findIndex((m) => m.id === activeId),
  );
  const active = images[activeIndex] || null;

  const go = useCallback(
    (delta: number) => {
      if (images.length === 0) return;
      const next = (activeIndex + delta + images.length) % images.length;
      setActiveId(images[next].id);
    },
    [activeIndex, images],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "Escape") setFullscreen(false);
      if (e.key === "f" || e.key === "F") setFullscreen((v) => !v);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  useEffect(() => {
    if (!fullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [fullscreen]);

  const activeSrc =
    active && active.hasBlob
      ? `/api/content/media-file/${active.id}?variant=large`
      : null;

  async function runAction(action: "publish" | "unpublish" | "save" | "archive") {
    setBusy(true);
    setStatusMessage("");
    try {
      const res = await fetch("/api/content/publish", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          action,
          fields: {
            vehicle,
            workDate: workDate || null,
            shadePercentage: shade || null,
            description: description || null,
            seoTitle: seoTitle || null,
            seoDescription: seoDescription || null,
            slug,
            featuredMediaId: featuredId,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setStatusMessage(data.error || "Unable to update publish state.");
        return;
      }

      setPublished(Boolean(data.published));
      if (action === "publish") {
        setLifecycleStatus("published");
        const rotated = data.archivedIds?.length
          ? ` Rotated ${data.archivedIds.length} older project(s) out of the live showcase.`
          : "";
        setStatusMessage(`Published to the live showcase.${rotated}`);
      } else if (action === "unpublish") {
        setLifecycleStatus("draft");
        setPinned(false);
        setStatusMessage("Moved to draft. Hidden from the public site.");
      } else if (action === "archive") {
        setLifecycleStatus("archived");
        setPublished(false);
        setPinned(false);
        setStatusMessage("Archived. Eligible for Blob cleanup after retention.");
      } else {
        setStatusMessage("Draft fields saved.");
      }
      router.refresh();
    } catch {
      setStatusMessage("Network error while updating publish state.");
    } finally {
      setBusy(false);
    }
  }

  async function togglePin() {
    setBusy(true);
    setStatusMessage("");
    try {
      const res = await fetch("/api/portfolio/lifecycle", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          action: pinned ? "unpin" : "pin",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setStatusMessage(data.error || "Unable to update pin state.");
        return;
      }
      setPinned(Boolean(data.pinned));
      setStatusMessage(data.pinned ? "Pinned in the live showcase." : "Unpinned.");
      router.refresh();
    } catch {
      setStatusMessage("Network error while updating pin.");
    } finally {
      setBusy(false);
    }
  }

  async function restoreToReview() {
    setBusy(true);
    setStatusMessage("");
    try {
      const res = await fetch("/api/portfolio/lifecycle", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          action: "restore",
          reprocess: true,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setStatusMessage(data.error || "Unable to restore project.");
        return;
      }
      setLifecycleStatus("pending_review");
      setPublished(false);
      setStatusMessage(
        data.restored?.needsReprocess
          ? "Restored to Review. Media reprocessing queued from Drive."
          : "Restored to Review Queue.",
      );
      router.refresh();
    } catch {
      setStatusMessage("Network error while restoring.");
    } finally {
      setBusy(false);
    }
  }

  async function reanalyzeIntelligence() {
    setBusy(true);
    setStatusMessage("");
    try {
      const res = await fetch("/api/portfolio/intelligence/analyze", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, force: true }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setStatusMessage(data.error || "Unable to analyze project.");
        return;
      }
      setIntelligence({
        galleryItemId: item.id,
        ignored: false,
        analyzedAt: new Date().toISOString(),
        staleAt: null,
        ...data.analysis,
      });
      setStatusMessage("Portfolio intelligence updated.");
      router.refresh();
    } catch {
      setStatusMessage("Network error while analyzing project.");
    } finally {
      setBusy(false);
    }
  }

  async function applyIntelligence(input: {
    featuredMediaId?: string | null;
    galleryOrder?: string[];
    markHomepageCandidate?: boolean;
  }) {
    setBusy(true);
    setStatusMessage("");
    try {
      const res = await fetch("/api/portfolio/intelligence/apply", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, ...input }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setStatusMessage(data.error || "Unable to apply intelligence suggestions.");
        return;
      }
      if (input.featuredMediaId) {
        setFeaturedId(input.featuredMediaId);
        setActiveId(input.featuredMediaId);
      }
      setStatusMessage("Intelligence suggestions applied.");
      router.refresh();
    } catch {
      setStatusMessage("Network error while applying suggestions.");
    } finally {
      setBusy(false);
    }
  }

  async function ignoreIntelligence(restore = false) {
    setBusy(true);
    setStatusMessage("");
    try {
      const res = await fetch("/api/portfolio/intelligence/ignore", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, ignored: !restore }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setStatusMessage(data.error || "Unable to update recommendation state.");
        return;
      }
      setIntelligence((current) =>
        current ? { ...current, ignored: !restore } : current,
      );
      setStatusMessage(restore ? "Recommendation restored." : "Recommendation ignored.");
      router.refresh();
    } catch {
      setStatusMessage("Network error while updating recommendation.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="review-detail">
      <div className="review-detail-top">
        <div>
          <Link href="/admin/review" className="review-back-link">
            ← Review Workspace
          </Link>
          <div className="review-detail-heading">
            <h1 className="review-detail-title">{item.vehicle}</h1>
            {published && (
              <span className="review-badge review-badge-ready review-badge-inline">
                {pinned ? "Pinned" : "Published"}
              </span>
            )}
            {isArchived && (
              <span className="review-badge review-badge-muted review-badge-inline">
                Archived
              </span>
            )}
          </div>
          <p className="review-detail-sub">
            {item.serviceType} ·{" "}
            {item.workDate ? formatDate(item.workDate) : "Date needs review"}
            {item.provisionalVehicle ? " · Provisional title" : ""}
            {published ? (
              <>
                {" · "}
                <Link
                  href={`/recent-work/${slug}`}
                  className="review-live-link"
                  target="_blank"
                >
                  View live
                </Link>
              </>
            ) : null}
          </p>
        </div>
        <div className="review-detail-tabs">
          <button
            type="button"
            className={`review-tab ${tab === "edit" ? "is-active" : ""}`}
            onClick={() => setTab("edit")}
          >
            Details
          </button>
          <button
            type="button"
            className={`review-tab ${tab === "preview" ? "is-active" : ""}`}
            onClick={() => setTab("preview")}
          >
            Website Preview
          </button>
        </div>
      </div>

      {tab === "preview" ? (
        <WebsitePreview
          vehicle={vehicle}
          workDate={workDate}
          shade={shade}
          description={description}
          seoTitle={seoTitle}
          images={images}
          featuredId={featuredId}
        />
      ) : (
        <div className="review-detail-split">
          <section className="review-viewer">
            <div
              className={`review-viewer-stage ${fullscreen ? "is-fullscreen" : ""}`}
            >
              {activeSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={activeSrc}
                  alt={active?.filename || vehicle}
                  className="review-viewer-image"
                />
              ) : (
                <div className="review-viewer-empty">
                  Photography previews appear once Media Workspace finishes
                  processing this job.
                </div>
              )}
              <div className="review-viewer-controls">
                <button
                  type="button"
                  className="review-btn review-btn-soft"
                  onClick={() => go(-1)}
                  disabled={images.length < 2}
                >
                  Prev
                </button>
                <button
                  type="button"
                  className="review-btn review-btn-soft"
                  onClick={() => go(1)}
                  disabled={images.length < 2}
                >
                  Next
                </button>
                <button
                  type="button"
                  className="review-btn review-btn-soft"
                  onClick={() => setFullscreen((v) => !v)}
                >
                  {fullscreen ? "Exit" : "Fullscreen"}
                </button>
              </div>
              {fullscreen && (
                <p className="review-viewer-hint">
                  ← → navigate · Esc exit · F toggle
                </p>
              )}
            </div>

            {images.length > 0 && (
              <div className="review-thumb-strip">
                {images.map((media) => {
                  const src = media.hasBlob
                    ? `/api/content/media-file/${media.id}?variant=thumbnail`
                    : null;
                  return (
                    <button
                      key={media.id}
                      type="button"
                      className={`review-thumb ${activeId === media.id ? "is-active" : ""}`}
                      onClick={() => setActiveId(media.id)}
                    >
                      {src ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={src} alt={media.filename} />
                      ) : (
                        <span>{media.filename.slice(0, 8)}</span>
                      )}
                      {featuredId === media.id && (
                        <em className="review-thumb-featured">Featured</em>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <aside className="review-meta-panel">
            <div className="review-field-group">
              <p className="review-panel-kicker">Vehicle</p>
              <label className="review-label">Name</label>
              <input
                className="review-field mb-4"
                value={vehicle}
                onChange={(e) => setVehicle(e.target.value)}
              />
              <label className="review-label">Work date</label>
              <input
                className="review-field mb-4"
                type="date"
                value={workDate}
                onChange={(e) => setWorkDate(e.target.value)}
              />
              <label className="review-label">Tint package</label>
              <input
                className="review-field"
                value={shade}
                onChange={(e) => setShade(e.target.value)}
                placeholder="e.g. 15% ceramic"
              />
            </div>

            <div className="review-field-group">
              <p className="review-panel-kicker">Story</p>
              <label className="review-label">Description</label>
              <textarea
                className="review-field min-h-28"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short editorial description for the public page…"
              />
            </div>

            <div className="review-field-group">
              <p className="review-panel-kicker">Discovery</p>
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
              <label className="review-label">Slug</label>
              <input
                className="review-field"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
              />
            </div>

            <div className="review-field-group">
              <p className="review-panel-kicker">Featured image</p>
              <div className="review-featured-list">
                {images.map((media) => (
                  <label key={media.id} className="review-featured-option">
                    <input
                      type="radio"
                      name="featured"
                      checked={featuredId === media.id}
                      onChange={() => {
                        setFeaturedId(media.id);
                        setActiveId(media.id);
                      }}
                    />
                    <span className="truncate">{media.filename}</span>
                  </label>
                ))}
                {images.length === 0 && (
                  <p className="review-help">No images yet.</p>
                )}
              </div>
            </div>

            <ReviewIntelligencePanel
              intelligence={intelligence}
              busy={busy}
              onApplyFeatured={(mediaId) =>
                applyIntelligence({ featuredMediaId: mediaId })
              }
              onApplyGalleryOrder={(order) =>
                applyIntelligence({ galleryOrder: order })
              }
              onMarkHomepageCandidate={() =>
                applyIntelligence({ markHomepageCandidate: true })
              }
              onPin={togglePin}
              onIgnore={() =>
                intelligence?.ignored
                  ? ignoreIntelligence(true)
                  : ignoreIntelligence(false)
              }
              onReanalyze={reanalyzeIntelligence}
            />

            {statusMessage && (
              <p className="review-status-message">{statusMessage}</p>
            )}

            <div className="review-actions">
              <button
                type="button"
                className="review-btn review-btn-ghost"
                disabled={busy}
                onClick={() => runAction("save")}
              >
                {busy ? "Saving…" : "Save draft"}
              </button>
              {isArchived ? (
                <button
                  type="button"
                  className="review-btn review-btn-primary"
                  disabled={busy}
                  onClick={restoreToReview}
                >
                  Restore to Review
                </button>
              ) : published ? (
                <>
                  <button
                    type="button"
                    className="review-btn review-btn-ghost"
                    disabled={busy}
                    onClick={togglePin}
                  >
                    {pinned ? "Unpin" : "Pin"}
                  </button>
                  <button
                    type="button"
                    className="review-btn review-btn-ghost"
                    disabled={busy}
                    onClick={() => runAction("unpublish")}
                  >
                    Unpublish
                  </button>
                  <button
                    type="button"
                    className="review-btn review-btn-ghost"
                    disabled={busy}
                    onClick={() => runAction("archive")}
                  >
                    Archive
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="review-btn review-btn-primary"
                    disabled={busy || !ready}
                    title={
                      ready
                        ? "Publish to the live showcase"
                        : "Requires ready media with no pending or failed files"
                    }
                    onClick={() => runAction("publish")}
                  >
                    Publish
                  </button>
                  <button
                    type="button"
                    className="review-btn review-btn-ghost"
                    disabled={busy}
                    onClick={() => runAction("archive")}
                  >
                    Archive
                  </button>
                </>
              )}
            </div>
            {!published && !ready && !isArchived && (
              <p className="review-help">
                Publish unlocks when Media Workspace finishes with at least one
                ready image and no pending or failed files. A full showcase
                automatically archives the oldest non-pinned project.
              </p>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

function WebsitePreview({
  vehicle,
  workDate,
  shade,
  description,
  seoTitle,
  images,
  featuredId,
}: {
  vehicle: string;
  workDate: string;
  shade: string;
  description: string;
  seoTitle: string;
  images: ReviewDetailItem["media"];
  featuredId: string | null;
}) {
  const ordered = [...images].sort((a, b) => {
    if (a.id === featuredId) return -1;
    if (b.id === featuredId) return 1;
    return a.sortOrder - b.sortOrder;
  });

  return (
    <div className="website-preview">
      <div className="website-preview-chrome">
        <span className="website-preview-dot" />
        <span className="website-preview-dot" />
        <span className="website-preview-dot" />
        <span className="website-preview-chrome-label">
          Public page preview
        </span>
      </div>
      <div className="website-preview-frame">
        <p className="website-preview-kicker">Recent Work</p>
        <h2 className="website-preview-title">
          {vehicle || "Untitled vehicle"}
        </h2>
        <p className="website-preview-meta">
          Window Tint · Altoona, PA
          {workDate ? ` · ${formatDate(workDate)}` : ""}
          {shade ? ` · ${shade}` : ""}
        </p>
        {(seoTitle || description) && (
          <p className="website-preview-copy">{description || seoTitle}</p>
        )}

        <div className="website-preview-grid">
          {ordered.length === 0 ? (
            <div className="website-preview-empty">
              Gallery photography will appear here once media is ready.
            </div>
          ) : (
            ordered.map((media, index) => {
              const src = media.hasBlob
                ? `/api/content/media-file/${media.id}?variant=${index === 0 ? "large" : "medium"}`
                : null;
              return (
                <figure
                  key={media.id}
                  className={`website-preview-shot ${index === 0 ? "is-hero" : ""}`}
                >
                  {src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={src} alt={media.filename} />
                  ) : (
                    <div className="website-preview-missing">
                      {media.filename}
                    </div>
                  )}
                </figure>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
