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
      { threshold: 0.12 },
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
      <div className="mx-auto max-w-7xl px-5 pt-16 sm:px-8 sm:pt-20 lg:px-12 lg:pt-24">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end lg:gap-12">
          <div className="lg:col-span-7">
            <p className="label-mono mb-4 text-white/40">Our shop</p>
            <h2 className="max-w-2xl text-[clamp(1.85rem,4.2vw,3.1rem)] font-light leading-[1.08] tracking-[-0.03em]">
              Nearly three decades.
              <br />
              One shop.
              <br />
              <span className="text-white/50">Built on the work.</span>
            </h2>
          </div>
          <div className="lg:col-span-5 lg:pb-1">
            <p className="max-w-md text-sm leading-[1.8] text-white/45 sm:text-base">
              AutoDV8ions has served Altoona and Central Pennsylvania from the
              same shop for nearly three decades.
            </p>
          </div>
        </div>
      </div>

      <div className="shop-showcase-frame mt-8 sm:mt-10">
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

      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-10 lg:px-12">
        <p className="text-sm text-white/40">
          Clean installs. Straight answers. Respect for every vehicle that comes
          through.
        </p>
        <Link
          href="/about"
          className="inline-flex label-mono shrink-0 text-white/50 transition-colors duration-500 hover:text-white"
        >
          About the shop →
        </Link>
      </div>
    </section>
  );
}
