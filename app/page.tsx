import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import ScrollIndicator from "./components/ScrollIndicator";
import HomeShowcaseSlider from "@/components/portfolio/HomeShowcaseSlider";
import BeyondTintStrip from "@/components/site/BeyondTintStrip";
import BrandLogoMoment from "@/components/site/BrandLogoMoment";
import InsideTheWork from "@/components/site/InsideTheWork";
import ServiceCards from "@/components/site/ServiceCards";
import ShopShowcase from "@/components/site/ShopShowcase";
import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import { listHomepagePortfolio } from "@/lib/live-portfolio/public-portfolio";

export const dynamic = "force-dynamic";

const HERO_IMAGE =
  "https://static.wixstatic.com/media/24f460_4d7dd7a8905842738274a4951ce65994~mv2.jpg/v1/fill/w_1600,h_894,q_90,enc_avif,quality_auto/24f460_4d7dd7a8905842738274a4951ce65994~mv2.jpg";

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
        {/* 1. Tesla hero — restored static treatment */}
        <section className="relative flex min-h-[100svh] items-end overflow-hidden">
          <div className="absolute inset-0 image-zoom">
            <Image
              src={HERO_IMAGE}
              alt="Custom vehicle build by AutoDV8ions"
              fill
              className="zoom-target object-cover object-center"
              priority
              sizes="100vw"
            />
          </div>

          <div className="image-overlay" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/20 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_80%,rgba(201,0,0,0.08)_0%,transparent_50%)]" />

          <div className="relative z-10 mx-auto w-full max-w-7xl px-5 pb-16 pt-32 sm:px-8 sm:pb-24 lg:px-12 lg:pb-32">
            <span className="label-mono mb-4 block animate-fade-up text-white/40">
              // Altoona, PA · Est. 1998
            </span>

            <h1 className="max-w-3xl animate-fade-up text-[clamp(2rem,6vw,4.5rem)] font-light leading-[1.05] tracking-[-0.02em] text-white [animation-delay:0.1s]">
              Elevate the ride.
              <br />
              <span className="text-white/60">Not just modify it.</span>
            </h1>

            <p className="mt-6 max-w-md animate-fade-up text-sm leading-relaxed text-white/50 [animation-delay:0.2s] sm:text-base">
              27 years in Altoona — window tint, remote starters, vehicle
              security, and select custom work.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-6 animate-fade-up [animation-delay:0.3s]">
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
                className="group inline-flex items-center gap-3 text-xs uppercase tracking-[0.15em] text-white/45 transition-all duration-500 hover:text-white"
              >
                View Builds
              </a>

              <span className="accent-line" />

              <span className="label-mono text-white/30">Altoona, PA</span>
            </div>
          </div>
        </section>

        {/* 2. Story */}
        <section
          id="about"
          className="relative border-t border-white/[0.04] py-16 sm:py-20 lg:py-24"
        >
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
            <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
              <div className="lg:col-span-5">
                <h2 className="text-[clamp(1.75rem,3.8vw,2.6rem)] font-light leading-[1.1] tracking-[-0.03em]">
                  Tint first.
                  <br />
                  Everything else when it fits.
                </h2>
              </div>
              <div className="lg:col-span-6 lg:col-start-7">
                <p className="text-base leading-[1.8] text-white/55 sm:text-lg">
                  Chris has been doing this work for 27 years. Tint is still the
                  main focus — clean installs, straight talk, and respect for the
                  vehicle in the bay.
                </p>
                <p className="mt-5 text-sm leading-[1.8] text-white/40 sm:text-base">
                  Remote starters, vehicle security, and select audio or custom
                  upgrades when the project makes sense.
                </p>
                <Link
                  href="/about"
                  className="mt-8 inline-flex label-mono text-white/45 transition-colors duration-500 hover:text-white"
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
          className="relative border-t border-white/[0.04] py-16 sm:py-20 lg:py-24"
        >
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
            <div className="mb-10 max-w-xl sm:mb-12">
              <h2 className="text-[clamp(1.75rem,3.8vw,2.6rem)] font-light tracking-[-0.03em]">
                What we do
              </h2>
            </div>
            <ServiceCards />
          </div>
        </section>

        {/* 4. Shop */}
        <ShopShowcase />

        {/* 5. Inside the work — controlled tint video */}
        <InsideTheWork />

        {/* 6. Portfolio */}
        <section
          id="gallery"
          className="relative border-t border-white/[0.04] py-16 sm:py-20 lg:py-24"
        >
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
            <div className="mb-8 flex flex-col gap-4 sm:mb-10 lg:flex-row lg:items-end lg:justify-between">
              <h2 className="max-w-xl text-[clamp(1.75rem,3.8vw,2.6rem)] font-light tracking-[-0.03em]">
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

        {/* 7. Beyond tint */}
        <BeyondTintStrip />

        {/* 8. CTA + logo moment */}
        <BrandLogoMoment />
      </main>

      <SiteFooter />
    </>
  );
}
