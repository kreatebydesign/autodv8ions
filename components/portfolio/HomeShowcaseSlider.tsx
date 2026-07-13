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
    lastX: number;
    lastT: number;
    velocity: number;
  }>({
    active: false,
    startX: 0,
    scrollLeft: 0,
    moved: false,
    lastX: 0,
    lastT: 0,
    velocity: 0,
  });
  const momentumRef = useRef<number | null>(null);

  const stopMomentum = useCallback(() => {
    if (momentumRef.current != null) {
      cancelAnimationFrame(momentumRef.current);
      momentumRef.current = null;
    }
  }, []);

  const scrollByCard = useCallback(
    (direction: -1 | 1) => {
      const node = scrollerRef.current;
      if (!node) return;
      stopMomentum();
      const card = node.querySelector<HTMLElement>(".home-gallery-card");
      const amount = card ? card.offsetWidth + 28 : node.clientWidth * 0.82;
      node.scrollBy({ left: direction * amount, behavior: "smooth" });
    },
    [stopMomentum],
  );

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

  useEffect(() => () => stopMomentum(), [stopMomentum]);

  function runMomentum(initialVelocity: number) {
    const node = scrollerRef.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let velocity = initialVelocity;
    const friction = 0.94;

    function tick() {
      if (!node || Math.abs(velocity) < 0.15) {
        momentumRef.current = null;
        return;
      }
      node.scrollLeft -= velocity;
      velocity *= friction;
      momentumRef.current = requestAnimationFrame(tick);
    }

    momentumRef.current = requestAnimationFrame(tick);
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const node = scrollerRef.current;
    if (!node) return;
    stopMomentum();
    dragRef.current = {
      active: true,
      startX: e.clientX,
      scrollLeft: node.scrollLeft,
      moved: false,
      lastX: e.clientX,
      lastT: performance.now(),
      velocity: 0,
    };
    node.setPointerCapture(e.pointerId);
    node.classList.add("is-dragging");
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const node = scrollerRef.current;
    if (!drag.active || !node) return;
    const now = performance.now();
    const delta = e.clientX - drag.startX;
    if (Math.abs(delta) > 6) drag.moved = true;
    node.scrollLeft = drag.scrollLeft - delta;

    const dt = Math.max(now - drag.lastT, 1);
    drag.velocity = ((e.clientX - drag.lastX) / dt) * 16;
    drag.lastX = e.clientX;
    drag.lastT = now;
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
    if (Math.abs(drag.velocity) > 0.4) {
      runMomentum(drag.velocity);
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
                        : ""}
                    </p>
                    <span className="home-gallery-cta">View Project →</span>
                  </div>
                </div>
              </Link>
            </article>
          );
        })}
      </div>
    </div>
  );
}
