"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

/**
 * Quiet full-bleed photography break.
 * No large headlines — photography carries the section.
 */
export default function EditorialBreak({
  imageSrc,
  imageAlt,
  label,
}: {
  imageSrc: string;
  imageAlt: string;
  label?: string;
}) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      node.classList.add("is-visible");
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.18 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} className="editorial-break editorial-break-quiet reveal-section">
      <div className="editorial-break-media">
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          className="editorial-break-image object-cover"
          sizes="100vw"
        />
        <div className="editorial-break-veil editorial-break-veil-soft" />
      </div>
      {label ? (
        <div className="editorial-break-copy editorial-break-copy-quiet">
          <p className="label-mono text-white/40">{label}</p>
        </div>
      ) : null}
    </section>
  );
}
