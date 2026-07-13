"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";

const ATMOSPHERE = [
  { src: "/images/editorial/service-work.jpg", alt: "" },
  { src: "/images/editorial/service-classic.jpg", alt: "" },
  { src: "/images/editorial/service-tint.jpg", alt: "" },
  { src: "/images/editorial/service-bay.jpg", alt: "" },
];

const LINKS = [
  {
    title: "Remote Starters",
    href: "/services/remote-starters",
    cta: "Request More Info",
  },
  {
    title: "Vehicle Security",
    href: "/services/vehicle-security",
    cta: "Request More Info",
  },
  {
    title: "Audio + Custom",
    href: "/services/audio-custom",
    cta: "Submit Project for Review",
  },
];

export default function BeyondTintStrip() {
  const fieldRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const section = field.closest("section");
    if (!section) return;

    let frame = 0;
    function onScroll() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!section || !field) return;
        const rect = section.getBoundingClientRect();
        const view = window.innerHeight || 1;
        const progress = (view - rect.top) / (view + rect.height);
        const offset = (progress - 0.5) * 28;
        field.style.transform = `translate3d(0, ${offset.toFixed(2)}px, 0)`;
      });
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <section className="beyond-tint relative border-t border-white/[0.04]">
      <div ref={fieldRef} className="beyond-tint-field" aria-hidden="true">
        <div className="beyond-tint-track">
          {[...ATMOSPHERE, ...ATMOSPHERE].map((image, index) => (
            <div key={`${image.src}-${index}`} className="beyond-tint-cell">
              <Image
                src={image.src}
                alt=""
                fill
                className="object-cover opacity-[0.22]"
                sizes="25vw"
              />
            </div>
          ))}
        </div>
        <div className="beyond-tint-fade" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16 lg:px-12 lg:py-[4.5rem]">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-4">
            <h2 className="beyond-tint-title text-[clamp(1.65rem,3.2vw,2.25rem)] font-light tracking-[-0.03em]">
              Beyond tint
            </h2>
            <p className="beyond-tint-support mt-3 max-w-sm text-sm leading-relaxed text-white/50">
              Remote starters, security, and select custom work — when the job
              makes sense.
            </p>
          </div>
          <div className="divide-y divide-white/[0.1] lg:col-span-7 lg:col-start-6">
            {LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="beyond-tint-link group flex items-baseline justify-between gap-6 py-4 transition-colors duration-500 sm:py-5"
              >
                <span className="text-xl font-light tracking-tight text-white transition-colors group-hover:text-white sm:text-2xl">
                  {item.title}
                </span>
                <span className="label-mono shrink-0 text-white/55 transition-colors group-hover:text-white">
                  {item.cta} →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
