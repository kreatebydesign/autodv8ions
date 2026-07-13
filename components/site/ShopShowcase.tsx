"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";

export default function ShopShowcase() {
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
      { threshold: 0.15 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      id="shop"
      className="shop-showcase reveal-section border-t border-white/[0.04]"
    >
      <div className="mx-auto max-w-7xl px-5 pt-20 sm:px-8 sm:pt-28 lg:px-12 lg:pt-32">
        <p className="label-mono mb-5 text-white/40">Our shop</p>
        <h2 className="max-w-3xl text-[clamp(1.9rem,4.5vw,3.4rem)] font-light leading-[1.08] tracking-[-0.03em]">
          Nearly three decades.
          <br />
          One location.
          <br />
          <span className="text-white/45">Thousands of vehicles.</span>
        </h2>
      </div>

      <div className="shop-showcase-frame mt-10 sm:mt-14">
        <div className="shop-showcase-media">
          <Image
            src="/images/wraps/autodv8ions-shop.jpg"
            alt="AutoDV8ions shop exterior in Altoona, Pennsylvania"
            fill
            className="shop-showcase-image object-cover object-center"
            sizes="100vw"
            priority={false}
          />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16 lg:flex lg:items-end lg:justify-between lg:px-12 lg:py-20">
        <p className="max-w-md text-sm leading-[1.8] text-white/45 sm:text-base">
          A trusted local shop in Altoona — clean installs, honest
          recommendations, and respect for every vehicle that rolls through the
          bay.
        </p>
        <Link
          href="/about"
          className="mt-8 inline-flex label-mono text-white/50 transition-colors duration-500 hover:text-white lg:mt-0"
        >
          About the shop →
        </Link>
      </div>
    </section>
  );
}
