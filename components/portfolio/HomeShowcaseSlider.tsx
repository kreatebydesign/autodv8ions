"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PublicPortfolioCard } from "@/lib/live-portfolio/public-portfolio";
import { publicMediaUrl } from "@/lib/live-portfolio/public-media-url";
import { formatDate } from "@/lib/utils/format";

export default function HomeShowcaseSlider({
  items,
}: {
  items: PublicPortfolioCard[];
}) {
  const [active, setActive] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const count = items.length;

  const go = useCallback(
    (delta: number) => {
      if (count === 0) return;
      setActive((i) => (i + delta + count) % count);
    },
    [count],
  );

  useEffect(() => {
    if (count < 2) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [count, go]);

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.changedTouches[0]?.clientX ?? null;
  }

  function onTouchEnd(e: React.TouchEvent) {
    const start = touchStartX.current;
    touchStartX.current = null;
    if (start == null || count < 2) return;

    const end = e.changedTouches[0]?.clientX ?? start;
    const delta = end - start;
    if (Math.abs(delta) < 48) return;
    go(delta < 0 ? 1 : -1);
  }

  if (count === 0) return null;

  const slide = items[active];

  return (
    <div
      className="home-showcase"
      role="region"
      aria-roledescription="carousel"
      aria-label="Recent tint work showcase"
    >
      <div
        className="home-showcase-viewport"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div
          className="home-showcase-track"
          style={{ transform: `translate3d(-${active * 100}%, 0, 0)` }}
        >
          {items.map((item) => {
            const src = item.coverMediaId
              ? publicMediaUrl(item.coverMediaId, "large")
              : null;
            return (
              <article
                key={item.id}
                className="home-showcase-slide"
                aria-hidden={item.id !== slide.id}
              >
                <Link
                  href={`/recent-work/${item.slug}`}
                  className="home-showcase-link group"
                >
                  <div className="home-showcase-media">
                    {src ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={src}
                        alt={item.vehicle}
                        className="home-showcase-image"
                        loading="lazy"
                        draggable={false}
                      />
                    ) : (
                      <div className="home-showcase-placeholder">
                        {item.vehicle.slice(0, 1)}
                      </div>
                    )}
                    <div className="home-showcase-veil" />
                    <div className="home-showcase-caption">
                      {item.pinned && (
                        <p className="home-showcase-kicker">Featured install</p>
                      )}
                      <h3 className="home-showcase-title">{item.vehicle}</h3>
                      <p className="home-showcase-meta">
                        {item.workDate ? formatDate(item.workDate) : "Recent work"}
                        {item.shadePercentage
                          ? ` · ${item.shadePercentage}`
                          : " · Window Tint"}
                      </p>
                      <span className="home-showcase-cta">View project →</span>
                    </div>
                  </div>
                </Link>
              </article>
            );
          })}
        </div>
      </div>

      {count > 1 && (
        <div className="home-showcase-controls">
          <div className="home-showcase-nav">
            <button
              type="button"
              className="home-showcase-btn"
              onClick={() => go(-1)}
              aria-label="Previous project"
            >
              Prev
            </button>
            <span className="home-showcase-counter">
              {String(active + 1).padStart(2, "0")} /{" "}
              {String(count).padStart(2, "0")}
            </span>
            <button
              type="button"
              className="home-showcase-btn"
              onClick={() => go(1)}
              aria-label="Next project"
            >
              Next
            </button>
          </div>

          <div className="home-showcase-dots" role="tablist" aria-label="Showcase slides">
            {items.map((item, index) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={index === active}
                aria-label={`Show ${item.vehicle}`}
                className={`home-showcase-dot ${index === active ? "is-active" : ""}`}
                onClick={() => setActive(index)}
              />
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
