import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import ProcessSteps from "@/components/site/ProcessSteps";
import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";

export const metadata: Metadata = {
  title: "About",
  description:
    "27 years of automotive craftsmanship in Altoona, PA — tint-focused work with remote starters, security, and select custom upgrades.",
};

export default function AboutPage() {
  return (
    <>
      <SiteHeader activeHref="/about" />
      <main className="pt-[4.5rem]">
        <section className="relative overflow-hidden border-b border-white/[0.05]">
          <div className="absolute inset-0">
            <Image
              src="/images/editorial/garage-window.jpg"
              alt="Editorial photograph of a vehicle in a dark garage lit by a window — atmosphere imagery, not an AutoDV8ions customer project."
              fill
              className="object-cover opacity-40"
              priority
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/85 to-black/50" />
          </div>
          <div className="relative z-10 mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28 lg:px-12">
            <p className="label-mono mb-4 text-white/45">About</p>
            <h1 className="max-w-3xl text-[clamp(2.25rem,5vw,4rem)] font-light tracking-[-0.02em]">
              Why AutoDV8ions
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-white/50 sm:text-base">
              A tint-first shop with 27 years of craftsmanship — calm
              recommendations, clean installs, and respect for every vehicle.
            </p>
          </div>
        </section>

        <section className="atmosphere relative py-16 sm:py-24">
          <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
            <div className="grid gap-10 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <p className="label-mono mb-4 text-white/40">The shop</p>
                <h2 className="text-[clamp(1.6rem,3vw,2.25rem)] font-light tracking-tight">
                  Local. Direct. Detail-minded.
                </h2>
              </div>
              <div className="space-y-5 lg:col-span-7">
                <p className="text-sm leading-[1.85] text-white/55 sm:text-base">
                  AutoDV8ions has served Altoona and Central Pennsylvania for 27
                  years. The work began with a simple standard: treat every
                  vehicle carefully and finish what you start.
                </p>
                <p className="text-sm leading-[1.85] text-white/45 sm:text-base">
                  Window tint remains the primary focus. Around that core, the
                  shop offers remote starters, vehicle security, and select audio
                  and custom upgrades when the project is a genuine fit.
                </p>
                <p className="text-sm leading-[1.85] text-white/45 sm:text-base">
                  We do not invent counts, awards, or guarantees. The reputation
                  is built in the bay — one clean install at a time.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-white/[0.04] py-16">
          <div className="mx-auto grid max-w-7xl gap-8 px-5 sm:px-8 lg:grid-cols-2 lg:px-12">
            <div className="relative aspect-[16/11] overflow-hidden">
              <Image
                src="/images/editorial/workshop-tools.jpg"
                alt="Editorial photograph of automotive diagnostic work — atmosphere imagery, not an AutoDV8ions customer project."
                fill
                className="object-cover"
                sizes="(max-width:1024px) 100vw, 50vw"
              />
              <p className="absolute bottom-3 left-3 label-mono text-white/50">
                Atmosphere imagery · Unsplash
              </p>
            </div>
            <div className="flex flex-col justify-center">
              <p className="label-mono mb-4 text-white/40">Standards</p>
              <ul className="space-y-4 text-sm leading-relaxed text-white/45">
                <li>Clear recommendations without pressure</li>
                <li>Respect for trim, glass, and factory systems</li>
                <li>Selective acceptance of custom work</li>
                <li>Real published tint projects kept separate from editorial imagery</li>
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

        <section className="border-t border-white/[0.04] py-16 sm:py-20">
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
