"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef } from "react";
import type { PublicPortfolioCard } from "@/lib/live-portfolio/public-portfolio";
import { publicMediaUrl } from "@/lib/live-portfolio/public-media-url";
import { formatDate } from "@/lib/utils/format";

export default function HomeShowcaseSlider({
  items,
}: {
  items: PublicPortfolioCard[];
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    active: boolean;
    startX: number;
    scrollLeft: number;
    moved: boolean;
  }>({ active: false, startX: 0, scrollLeft: 0, moved: false });

  const scrollByCard = useCallback((direction: -1 | 1) => {
    const node = scrollerRef.current;
    if (!node) return;
    const card = node.querySelector<HTMLElement>(".home-gallery-card");
    const amount = card ? card.offsetWidth + 20 : node.clientWidth * 0.8;
    node.scrollBy({ left: direction * amount, behavior: "smooth" });
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const node = scrollerRef.current;
      if (!node || items.length < 2) return;
      const focused = document.activeElement;
      if (
        focused !== node &&
        !node.contains(focused) &&
        focused !== document.body
      ) {
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        scrollByCard(1);
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        scrollByCard(-1);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [items.length, scrollByCard]);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const node = scrollerRef.current;
    if (!node) return;
    dragRef.current = {
      active: true,
      startX: e.clientX,
      scrollLeft: node.scrollLeft,
      moved: false,
    };
    node.setPointerCapture(e.pointerId);
    node.classList.add("is-dragging");
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const node = scrollerRef.current;
    if (!drag.active || !node) return;
    const delta = e.clientX - drag.startX;
    if (Math.abs(delta) > 6) drag.moved = true;
    node.scrollLeft = drag.scrollLeft - delta;
  }

  function endDrag(e: React.PointerEvent<HTMLDivElement>) {
    const node = scrollerRef.current;
    const drag = dragRef.current;
    if (!node || !drag.active) return;
    drag.active = false;
    node.classList.remove("is-dragging");
    try {
      node.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
  }

  function onClickCapture(e: React.MouseEvent) {
    if (dragRef.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      dragRef.current.moved = false;
    }
  }

  if (items.length === 0) return null;

  return (
    <div
      className="home-gallery"
      role="region"
      aria-roledescription="carousel"
      aria-label="Recent tint work"
    >
      <div
        ref={scrollerRef}
        className="home-gallery-scroller"
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={onClickCapture}
      >
        {items.map((item) => {
          const src = item.coverMediaId
            ? publicMediaUrl(item.coverMediaId, "large")
            : null;
          return (
            <article key={item.id} className="home-gallery-card">
              <Link
                href={`/recent-work/${item.slug}`}
                className="home-gallery-link group"
                draggable={false}
              >
                <div className="home-gallery-media">
                  {src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={src}
                      alt={item.vehicle}
                      className="home-gallery-image"
                      loading="lazy"
                      draggable={false}
                    />
                  ) : (
                    <div className="home-gallery-placeholder">
                      {item.vehicle.slice(0, 1)}
                    </div>
                  )}
                  <div className="home-gallery-veil" />
                  <div className="home-gallery-caption">
                    <h3 className="home-gallery-title">{item.vehicle}</h3>
                    <p className="home-gallery-meta">
                      {item.workDate
                        ? formatDate(item.workDate)
                        : "Recent work"}
                      {item.shadePercentage
                        ? ` · ${item.shadePercentage}`
                        : " · Window Tint"}
                    </p>
                    <span className="home-gallery-cta">View Project →</span>
                  </div>
                </div>
              </Link>
            </article>
          );
        })}
      </div>

      {items.length > 1 ? (
        <p className="home-gallery-hint label-mono">
          Drag or swipe · Arrow keys
        </p>
      ) : null}
    </div>
  );
}
