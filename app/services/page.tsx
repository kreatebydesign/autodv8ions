import type { Metadata } from "next";
import Link from "next/link";
import ServiceCards from "@/components/site/ServiceCards";
import ServicePageShell from "@/components/site/ServicePageShell";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Window tint, remote starters, vehicle security, and select audio and custom upgrades from AutoDV8ions in Altoona, PA.",
};

export default function ServicesPage() {
  return (
    <ServicePageShell
      activeHref="/services"
      eyebrow="Services"
      title="Clear work. Clean results."
      lead="Tint is the primary focus. Remote starters and security are established offerings. Audio and custom upgrades are accepted selectively."
      imageSrc="/images/editorial/steering-detail.jpg"
      imageAlt="Editorial close-up of a steering wheel and dashboard — atmosphere imagery, not an AutoDV8ions customer project."
      ctaHref="/tint-quote"
      ctaLabel="Get a Tint Quote"
    >
      <section className="atmosphere relative py-16 sm:py-24">
        <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
          <ServiceCards />

          <div className="mt-16 grid gap-6 border-t border-white/[0.05] pt-12 lg:grid-cols-2">
            <div className="panel p-6 sm:p-8">
              <p className="label-mono mb-3 text-white/35">Primary focus</p>
              <h2 className="text-xl font-light tracking-tight">Window Tint</h2>
              <p className="mt-3 text-sm leading-relaxed text-white/45">
                Comfort, privacy, glare control, and a cleaner finish —
                installed with care for the vehicle in front of us.
              </p>
              <Link
                href="/services/window-tint"
                className="mt-6 inline-flex label-mono text-white/55 hover:text-white"
              >
                Tint details →
              </Link>
            </div>
            <div className="panel p-6 sm:p-8">
              <p className="label-mono mb-3 text-white/35">Selective work</p>
              <h2 className="text-xl font-light tracking-tight">
                Audio + Custom Upgrades
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-white/45">
                Some vehicles need more than an off-the-shelf answer. We review
                scope before we commit.
              </p>
              <Link
                href="/services/audio-custom"
                className="mt-6 inline-flex label-mono text-white/55 hover:text-white"
              >
                Project review →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </ServicePageShell>
  );
}
