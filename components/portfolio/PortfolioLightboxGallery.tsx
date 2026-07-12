"use client";

import { useEffect, useState } from "react";
import { publicMediaUrl } from "@/lib/live-portfolio/public-media-url";

export default function PortfolioLightboxGallery({
  vehicle,
  images,
}: {
  vehicle: string;
  images: {
    id: string;
    filename: string;
    hasBlob: boolean;
  }[];
}) {
  const [active, setActive] = useState<number | null>(null);
  const viewable = images.filter((img) => img.hasBlob);

  useEffect(() => {
    if (active === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setActive(null);
      if (e.key === "ArrowRight") {
        setActive((i) =>
          i === null ? 0 : (i + 1) % viewable.length,
        );
      }
      if (e.key === "ArrowLeft") {
        setActive((i) =>
          i === null
            ? 0
            : (i - 1 + viewable.length) % viewable.length,
        );
      }
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [active, viewable.length]);

  if (viewable.length === 0) {
    return (
      <p className="text-sm text-white/40">
        Gallery media will appear here once published assets are available.
      </p>
    );
  }

  return (
    <>
      <div className="portfolio-detail-grid">
        {viewable.map((img, index) => (
          <button
            key={img.id}
            type="button"
            className={`portfolio-detail-shot ${index === 0 ? "is-hero" : ""}`}
            onClick={() => setActive(index)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={publicMediaUrl(img.id, index === 0 ? "large" : "medium")}
              alt={`${vehicle} — ${img.filename}`}
              loading={index === 0 ? "eager" : "lazy"}
            />
          </button>
        ))}
      </div>

      {active !== null && (
        <div
          className="portfolio-lightbox"
          role="dialog"
          aria-modal="true"
          onClick={() => setActive(null)}
        >
          <button
            type="button"
            className="portfolio-lightbox-close"
            onClick={() => setActive(null)}
          >
            Close
          </button>
          <button
            type="button"
            className="portfolio-lightbox-nav is-prev"
            onClick={(e) => {
              e.stopPropagation();
              setActive((i) =>
                i === null
                  ? 0
                  : (i - 1 + viewable.length) % viewable.length,
              );
            }}
          >
            Prev
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={publicMediaUrl(viewable[active].id, "large")}
            alt={viewable[active].filename}
            className="portfolio-lightbox-image"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            className="portfolio-lightbox-nav is-next"
            onClick={(e) => {
              e.stopPropagation();
              setActive((i) =>
                i === null ? 0 : (i + 1) % viewable.length,
              );
            }}
          >
            Next
          </button>
        </div>
      )}
    </>
  );
}
