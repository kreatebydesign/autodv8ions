import type { Metadata } from "next";
import Link from "next/link";
import ScrollIndicator from "./components/ScrollIndicator";
import HomeShowcaseSlider from "@/components/portfolio/HomeShowcaseSlider";
import HomeHeroVideo from "@/components/site/HomeHeroVideo";
import ServiceCards from "@/components/site/ServiceCards";
import ShopShowcase from "@/components/site/ShopShowcase";
import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import { listHomepagePortfolio } from "@/lib/live-portfolio/public-portfolio";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title:
    "AutoDV8ions | Window Tint, Remote Starters & Vehicle Upgrades in Altoona, PA",
};

export default async function Home() {
  const published = await listHomepagePortfolio();

  return (
    <>
      <ScrollIndicator />
      <SiteHeader activeHref="/" transparent />

      <main>
        {/* 1. Hero — cinematic tint video */}
        <section className="relative flex min-h-[100svh] items-end overflow-hidden">
          <HomeHeroVideo />

          <div className="relative z-10 mx-auto w-full max-w-7xl px-5 pb-16 pt-32 sm:px-8 sm:pb-24 lg:px-12 lg:pb-32">
            <h1 className="max-w-3xl animate-fade-up text-[clamp(2.15rem,6vw,4.6rem)] font-light leading-[1.02] tracking-[-0.03em] text-white">
              Elevate the ride.
            </h1>
            <p className="mt-6 max-w-sm animate-fade-up text-sm leading-relaxed text-white/50 [animation-delay:0.12s] sm:text-base">
              Window tint, remote starters, vehicle security, and select custom
              work — Altoona, PA since 1998.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-6 animate-fade-up [animation-delay:0.22s]">
              <Link
                href="/tint-quote"
                className="group inline-flex items-center gap-3 border border-white/15 bg-white/[0.05] px-6 py-3 text-xs uppercase tracking-[0.15em] text-white transition-all duration-500 hover:border-[var(--accent-dim)] hover:bg-white/[0.08] hover:shadow-[0_0_32px_var(--accent-glow)]"
              >
                Get Tint Quote
                <span className="inline-block transition-transform duration-500 group-hover:translate-x-1">
                  →
                </span>
              </Link>
              <a
                href="#gallery"
                className="text-xs uppercase tracking-[0.15em] text-white/40 transition-colors duration-500 hover:text-white"
              >
                Recent work
              </a>
            </div>
          </div>
        </section>

        {/* 2. Story */}
        <section
          id="about"
          className="relative border-t border-white/[0.04] py-24 sm:py-32 lg:py-40"
        >
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
            <div className="grid gap-14 lg:grid-cols-12 lg:gap-20">
              <div className="lg:col-span-5">
                <h2 className="text-[clamp(1.85rem,4vw,2.9rem)] font-light leading-[1.1] tracking-[-0.03em]">
                  Craftsmanship
                  <br />
                  before shortcuts.
                </h2>
              </div>
              <div className="lg:col-span-6 lg:col-start-7">
                <p className="text-base leading-[1.85] text-white/55 sm:text-lg">
                  For 27 years, AutoDV8ions has built a reputation on clean
                  installs and honest recommendations. Tint is the core of the
                  shop — and it stays that way.
                </p>
                <p className="mt-6 text-sm leading-[1.85] text-white/40 sm:text-base">
                  Remote starters, vehicle security, and select audio or custom
                  upgrades when the vehicle, scope, and schedule are the right
                  fit.
                </p>
                <Link
                  href="/about"
                  className="mt-10 inline-flex label-mono text-white/45 transition-colors duration-500 hover:text-white"
                >
                  Our story →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Services */}
        <section
          id="services"
          className="relative border-t border-white/[0.04] py-24 sm:py-32"
        >
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
            <div className="mb-14 max-w-xl">
              <h2 className="text-[clamp(1.85rem,4vw,2.9rem)] font-light tracking-[-0.03em]">
                What we do
              </h2>
            </div>
            <ServiceCards />
          </div>
        </section>

        {/* 4. Shop — real AutoDV8ions storefront */}
        <ShopShowcase />

        {/* 5. Portfolio — real customer work */}
        <section
          id="gallery"
          className="relative border-t border-white/[0.04] py-24 sm:py-32 lg:py-40"
        >
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
            <div className="mb-14 flex flex-col gap-6 lg:mb-20 lg:flex-row lg:items-end lg:justify-between">
              <h2 className="max-w-xl text-[clamp(1.85rem,4vw,2.9rem)] font-light tracking-[-0.03em]">
                Recent tint work
              </h2>
              <Link
                href="/recent-work"
                className="label-mono text-white/45 transition-colors duration-500 hover:text-white"
              >
                View all →
              </Link>
            </div>

            {published.length === 0 ? (
              <div className="portfolio-empty">
                <p>New tint work will appear here soon.</p>
                <Link href="/tint-quote" className="portfolio-inline-cta mt-6">
                  Get a Tint Quote →
                </Link>
              </div>
            ) : (
              <HomeShowcaseSlider items={published} />
            )}
          </div>
        </section>

        {/* 6. Additional services — quieter, less card-stack */}
        <section className="relative border-t border-white/[0.04] py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
            <div className="grid gap-16 lg:grid-cols-12 lg:gap-12">
              <div className="lg:col-span-4">
                <h2 className="text-[clamp(1.7rem,3.5vw,2.4rem)] font-light tracking-[-0.03em]">
                  Beyond tint
                </h2>
                <p className="mt-5 text-sm leading-relaxed text-white/40">
                  Established offerings for comfort and protection — plus select
                  custom work when it fits.
                </p>
              </div>
              <div className="divide-y divide-white/[0.06] lg:col-span-7 lg:col-start-6">
                {[
                  {
                    title: "Remote Starters",
                    href: "/services/remote-starters",
                    cta: "Consultation",
                  },
                  {
                    title: "Vehicle Security",
                    href: "/services/vehicle-security",
                    cta: "Consultation",
                  },
                  {
                    title: "Audio + Custom",
                    href: "/services/audio-custom",
                    cta: "Project review",
                  },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group flex items-baseline justify-between gap-6 py-6 transition-colors duration-500"
                  >
                    <span className="text-xl font-light tracking-tight text-white/85 transition-colors group-hover:text-white sm:text-2xl">
                      {item.title}
                    </span>
                    <span className="label-mono shrink-0 text-white/35 transition-colors group-hover:text-white/70">
                      {item.cta} →
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 7. CTA */}
        <section
          id="contact"
          className="relative border-t border-white/[0.04] py-24 sm:py-32 lg:py-40"
        >
          <div className="mx-auto max-w-7xl px-5 text-center sm:px-8 lg:px-12">
            <h2 className="mx-auto max-w-2xl text-[clamp(1.85rem,4vw,3rem)] font-light tracking-[-0.03em]">
              Ready when you are.
            </h2>
            <div className="mt-10 flex flex-col items-center justify-center gap-5 sm:flex-row">
              <Link
                href="/tint-quote"
                className="inline-flex items-center gap-3 border border-white/15 bg-white/[0.05] px-8 py-3.5 text-xs uppercase tracking-[0.15em] text-white transition-all duration-500 hover:border-[var(--accent-dim)] hover:bg-white/[0.08] hover:shadow-[0_0_32px_var(--accent-glow)]"
              >
                Get Tint Quote
              </Link>
              <Link
                href="/contact"
                className="label-mono text-white/40 transition-colors duration-500 hover:text-white"
              >
                Contact the Shop
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
