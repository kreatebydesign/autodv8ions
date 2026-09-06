import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import ProcessSteps from "@/components/site/ProcessSteps";
import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";

export const metadata: Metadata = {
  title: "About — Altoona, PA Since 1998",
  description:
    "AutoDV8ions in Altoona, PA — nearly three decades of window tint, remote starters, vehicle security, and select custom work for Central Pennsylvania.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <>
      <SiteHeader activeHref="/about" />
      <main className="pt-[4.5rem]">
        <section className="relative overflow-hidden border-b border-white/[0.05]">
          <div className="absolute inset-0">
            <Image
              src="/images/wraps/autodv8ions-shop.jpg"
              alt="AutoDV8ions shop exterior in Altoona, Pennsylvania"
              fill
              className="object-cover object-center opacity-55"
              priority
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-black/45" />
          </div>
          <div className="relative z-10 mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24 lg:px-12">
            <p className="label-mono mb-4 text-white/45">About</p>
            <h1 className="max-w-3xl text-[clamp(2.1rem,4.8vw,3.6rem)] font-light tracking-[-0.02em]">
              Same shop. Same focus.
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-white/55 sm:text-base">
              AutoDV8ions has been in Altoona for nearly three decades — tint
              first, with the rest handled when the job is a fit.
            </p>
          </div>
        </section>

        <section className="atmosphere relative py-14 sm:py-20">
          <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
            <div className="grid gap-10 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <p className="label-mono mb-4 text-white/40">The shop</p>
                <h2 className="text-[clamp(1.5rem,3vw,2.15rem)] font-light tracking-tight">
                  Local. Direct. Established.
                </h2>
              </div>
              <div className="space-y-5 lg:col-span-7">
                <p className="text-sm leading-[1.85] text-white/55 sm:text-base">
                  Chris has been doing this work for 27 years. Tint remains the
                  main focus, with remote starters, security, and select custom
                  work handled when the project makes sense.
                </p>
                <p className="text-sm leading-[1.85] text-white/45 sm:text-base">
                  AutoDV8ions has served Altoona and Central Pennsylvania from
                  the same shop for nearly three decades. Clean installs. Straight
                  answers. Respect for every vehicle that comes through.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-white/[0.04] py-14 sm:py-16">
          <div className="mx-auto grid max-w-7xl gap-8 px-5 sm:px-8 lg:grid-cols-2 lg:gap-12 lg:px-12">
            <div className="relative aspect-[16/11] overflow-hidden">
              <Image
                src="/images/wraps/autodv8ions-shop.jpg"
                alt="AutoDV8ions storefront in Altoona"
                fill
                className="object-cover"
                sizes="(max-width:1024px) 100vw, 50vw"
              />
            </div>
            <div className="flex flex-col justify-center">
              <p className="label-mono mb-4 text-white/40">How we work</p>
              <ul className="space-y-4 text-sm leading-relaxed text-white/50">
                <li>Tell you what fits the vehicle — and what doesn&apos;t</li>
                <li>Careful with glass, trim, and factory systems</li>
                <li>Selective about custom work</li>
                <li>Published tint projects are real customer installs</li>
              </ul>
              <Link
                href="/recent-work"
                className="mt-8 inline-flex label-mono text-white/55 hover:text-white"
              >
                View recent tint work →
              </Link>
            </div>
          </div>
        </section>

        <ProcessSteps />

        <section className="border-t border-white/[0.04] py-14 sm:py-18">
          <div className="mx-auto max-w-7xl px-5 text-center sm:px-8 lg:px-12">
            <h2 className="text-[clamp(1.5rem,3vw,2.1rem)] font-light tracking-tight">
              Ready to talk about your vehicle?
            </h2>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/tint-quote"
                className="inline-flex items-center gap-3 border border-white/15 bg-white/[0.05] px-6 py-3 text-xs uppercase tracking-[0.15em] text-white transition-all duration-500 hover:border-[var(--accent-dim)] hover:bg-white/[0.08]"
              >
                Get a Tint Quote
              </Link>
              <Link
                href="/contact"
                className="label-mono text-white/45 hover:text-white"
              >
                Contact the Shop →
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
