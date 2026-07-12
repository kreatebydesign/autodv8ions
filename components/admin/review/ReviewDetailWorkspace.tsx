"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReviewDetailItem } from "@/lib/live-portfolio/review-data";
import { formatDate } from "@/lib/utils/format";

type Tab = "edit" | "preview";

export default function ReviewDetailWorkspace({
  item,
}: {
  item: ReviewDetailItem;
}) {
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
  const [description, setDescription] = useState("");
  const [seoTitle, setSeoTitle] = useState(item.seoTitle || "");
  const [seoDescription, setSeoDescription] = useState(
    item.seoDescription || "",
  );
  const [slug, setSlug] = useState(item.slug);

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

  return (
    <div className="review-detail">
      <div className="review-detail-top">
        <div>
          <Link
            href="/admin/review"
            className="text-xs uppercase tracking-[0.18em] text-[var(--dv8-muted)] transition-colors hover:text-white"
          >
            ← Review Workspace
          </Link>
          <h1 className="mt-3 text-[clamp(1.75rem,3vw,2.75rem)] font-light tracking-tight">
            {item.vehicle}
          </h1>
          <p className="mt-2 text-sm text-[var(--dv8-muted)]">
            {item.serviceType} ·{" "}
            {item.workDate ? formatDate(item.workDate) : "Date needs review"}
            {item.provisionalVehicle ? " · Provisional title" : ""}
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
                  Media not processed yet. Run Media Processing to load private
                  previews.
                </div>
              )}
              <div className="review-viewer-controls">
                <button
                  type="button"
                  className="admin-btn"
                  onClick={() => go(-1)}
                  disabled={images.length < 2}
                >
                  Prev
                </button>
                <button
                  type="button"
                  className="admin-btn"
                  onClick={() => go(1)}
                  disabled={images.length < 2}
                >
                  Next
                </button>
                <button
                  type="button"
                  className="admin-btn"
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
            <p className="review-panel-kicker">Editorial fields</p>
            <p className="mb-5 text-sm text-[var(--dv8-muted)]">
              Presentation-only for Phase 3A. Saving and publishing arrive later.
            </p>

            <label className="admin-label">Vehicle</label>
            <input
              className="admin-input mb-4"
              value={vehicle}
              onChange={(e) => setVehicle(e.target.value)}
            />

            <label className="admin-label">Work date</label>
            <input
              className="admin-input mb-4"
              type="date"
              value={workDate}
              onChange={(e) => setWorkDate(e.target.value)}
            />

            <label className="admin-label">Description</label>
            <textarea
              className="admin-input mb-4 min-h-24"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short editorial description for the public page…"
            />

            <label className="admin-label">Tint details</label>
            <input
              className="admin-input mb-4"
              value={shade}
              onChange={(e) => setShade(e.target.value)}
              placeholder="e.g. 15% ceramic — confirmation required"
            />

            <label className="admin-label">SEO title</label>
            <input
              className="admin-input mb-4"
              value={seoTitle}
              onChange={(e) => setSeoTitle(e.target.value)}
            />

            <label className="admin-label">Meta description</label>
            <textarea
              className="admin-input mb-4 min-h-20"
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
            />

            <label className="admin-label">Slug</label>
            <input
              className="admin-input mb-6"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            />

            <label className="admin-label">Featured image</label>
            <div className="space-y-2">
              {images.map((media) => (
                <label
                  key={media.id}
                  className="flex cursor-pointer items-center gap-3 text-sm text-[var(--dv8-muted)]"
                >
                  <input
                    type="radio"
                    name="featured"
                    checked={featuredId === media.id}
                    onChange={() => {
                      setFeaturedId(media.id);
                      setActiveId(media.id);
                    }}
                  />
                  <span className="truncate text-[var(--dv8-white)]">
                    {media.filename}
                  </span>
                </label>
              ))}
              {images.length === 0 && (
                <p className="text-sm text-[var(--dv8-muted)]">No images yet.</p>
              )}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                className="admin-btn"
                disabled
                title="Later phase"
              >
                Save draft
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-primary"
                disabled
                title="Later phase"
              >
                Publish
              </button>
            </div>
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
      <div className="website-preview-frame">
        <p className="text-xs uppercase tracking-[0.2em] text-[#a1a1aa]">
          Recent Work · Preview
        </p>
        <h2 className="mt-4 text-[clamp(2rem,5vw,3.5rem)] font-light tracking-tight text-[#f8f8f8]">
          {vehicle || "Untitled vehicle"}
        </h2>
        <p className="mt-3 text-[#a1a1aa]">
          Window Tint · Altoona, PA
          {workDate ? ` · ${formatDate(workDate)}` : ""}
          {shade ? ` · ${shade}` : ""}
        </p>
        {(seoTitle || description) && (
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-[#d4d4d8]">
            {description || seoTitle}
          </p>
        )}

        <div className="website-preview-grid">
          {ordered.length === 0 ? (
            <div className="website-preview-empty">
              Processed gallery media will appear here after Media Processing.
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
